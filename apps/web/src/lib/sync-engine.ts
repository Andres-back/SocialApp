import type { SyncMutation } from '@socialapp/shared';
import { api } from './api';
import { db } from './db';

export interface SyncSummary {
  synced: number;
  pending: number;
  errors: number;
  conflicts: number;
}

let activeSync: Promise<SyncSummary> | null = null;

async function executeSync(): Promise<SyncSummary> {
  if (!navigator.onLine) throw new Error('Sin conexión. Tus cambios siguen guardados en este dispositivo.');

  await api.health();
  await db.syncQueue.where('status').equals('processing').modify({ status: 'pending' });
  const batch = await db.syncQueue.where('status').anyOf(['pending', 'error']).limit(50).toArray();
  if (batch.length === 0) return summarize();

  await db.transaction('rw', db.syncQueue, async () => {
    await Promise.all(batch.map((item) => db.syncQueue.update(item.mutationId, { status: 'processing' })));
  });

  try {
    const payload: SyncMutation[] = batch.map((item) => ({
      mutationId: item.mutationId,
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      baseVersion: item.baseVersion,
      occurredAt: item.occurredAt,
      payload: item.payload,
    }));
    const response = await api.pushMutations(payload);
    await db.transaction('rw', [db.syncQueue, db.athletes, db.socialRecords, db.socioeconomicAssessments, db.alerts, db.followUps, db.observations, db.diagrams, db.campaigns], async () => {
      for (const result of response.results) {
        const current = batch.find((item) => item.mutationId === result.mutationId);
        if (!current) continue;
        if (result.status === 'accepted') {
          if (current.entityType === 'athlete') {
            await db.athletes.update(current.entityId, { version: result.serverVersion ?? 1, syncStatus: 'synced' });
          }
          if (current.entityType === 'social-record') {
            await db.socialRecords.update(current.entityId, { version: result.serverVersion ?? 1, syncStatus: 'synced' });
          }
          if (current.entityType === 'socioeconomic-assessment') await db.socioeconomicAssessments.update(current.entityId, { version: result.serverVersion ?? 1, syncStatus: 'synced' });
          if (current.entityType === 'alert') await db.alerts.update(current.entityId, { version: result.serverVersion ?? 1, syncStatus: 'synced' });
          if (current.entityType === 'follow-up') await db.followUps.update(current.entityId, { version: result.serverVersion ?? 1, syncStatus: 'synced' });
          if (current.entityType === 'observation') await db.observations.update(current.entityId, { syncStatus: 'synced' });
          if (current.entityType === 'genogram' || current.entityType === 'ecomap') await db.diagrams.update(current.entityId, { version: result.serverVersion ?? 1, syncStatus: 'synced' });
          if (current.entityType === 'campaign') {
            const campaign = await db.campaigns.get(current.entityId);
            if (campaign) await db.campaigns.put({ ...campaign, version: result.serverVersion ?? 1, syncStatus: 'synced', participants: campaign.participants.map((participant) => ({ ...participant, syncStatus: 'synced' })) });
          }
          if (current.entityType === 'screening-result') {
            const campaigns = await db.campaigns.toArray();
            const campaign = campaigns.find((item) => item.participants.some((participant) => participant.id === current.entityId));
            if (campaign) {
              const version = result.serverVersion ?? 1;
              const participants = campaign.participants.map((participant) => participant.id === current.entityId ? { ...participant, version, syncStatus: 'synced' as const } : participant);
              await db.campaigns.put({ ...campaign, syncStatus: participants.every((participant) => !participant.syncStatus || participant.syncStatus === 'synced') ? 'synced' : 'pending', participants });
              const queued = await db.syncQueue.where('entityType').equals('screening-result').filter((item) => item.entityId === current.entityId && item.mutationId !== current.mutationId).toArray();
              for (const next of queued) await db.syncQueue.update(next.mutationId, { baseVersion: version, payload: { ...(next.payload as Record<string, unknown>), version } });
            }
          }
          await db.syncQueue.delete(result.mutationId);
        } else {
          if (current.entityType === 'athlete') await db.athletes.update(current.entityId, { syncStatus: result.status === 'conflict' ? 'conflict' : 'error' });
          if (current.entityType === 'social-record') await db.socialRecords.update(current.entityId, { syncStatus: result.status === 'conflict' ? 'conflict' : 'error' });
          if (current.entityType === 'socioeconomic-assessment') await db.socioeconomicAssessments.update(current.entityId, { syncStatus: result.status === 'conflict' ? 'conflict' : 'error' });
          if (current.entityType === 'alert') await db.alerts.update(current.entityId, { syncStatus: result.status === 'conflict' ? 'conflict' : 'error' });
          if (current.entityType === 'follow-up') await db.followUps.update(current.entityId, { syncStatus: result.status === 'conflict' ? 'conflict' : 'error' });
          if (current.entityType === 'observation') await db.observations.update(current.entityId, { syncStatus: result.status === 'conflict' ? 'conflict' : 'error' });
          if (current.entityType === 'genogram' || current.entityType === 'ecomap') await db.diagrams.update(current.entityId, { syncStatus: result.status === 'conflict' ? 'conflict' : 'error' });
          if (current.entityType === 'campaign') await db.campaigns.update(current.entityId, { syncStatus: result.status === 'conflict' ? 'conflict' : 'error' });
          if (current.entityType === 'screening-result') {
            const campaigns = await db.campaigns.toArray();
            const campaign = campaigns.find((item) => item.participants.some((participant) => participant.id === current.entityId));
            if (campaign) await db.campaigns.put({ ...campaign, syncStatus: result.status === 'conflict' ? 'conflict' : 'error', participants: campaign.participants.map((participant) => participant.id === current.entityId ? { ...participant, syncStatus: result.status === 'conflict' ? 'conflict' : 'error' } : participant) });
          }
          await db.syncQueue.update(result.mutationId, {
            status: result.status === 'conflict' ? 'conflict' : 'error',
            attempts: current.attempts + 1,
            lastError: result.message,
          });
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible sincronizar.';
    await Promise.all(
      batch.map((item) =>
        db.syncQueue.update(item.mutationId, {
          status: 'error',
          attempts: item.attempts + 1,
          lastError: message,
          nextAttemptAt: new Date(Date.now() + Math.min(60_000, 2 ** item.attempts * 1000)).toISOString(),
        }),
      ),
    );
    throw new Error('No fue posible sincronizar en este momento. Tu información permanece guardada en el dispositivo.');
  }
  return summarize();
}

async function summarize(): Promise<SyncSummary> {
  const all = await db.syncQueue.toArray();
  return {
    synced: 0,
    pending: all.filter((item) => item.status === 'pending' || item.status === 'processing').length,
    errors: all.filter((item) => item.status === 'error').length,
    conflicts: all.filter((item) => item.status === 'conflict').length,
  };
}

export function synchronize(): Promise<SyncSummary> {
  if (!activeSync) activeSync = (async () => {
    let summary = await executeSync();
    while (await db.syncQueue.where('status').equals('pending').count()) summary = await executeSync();
    return summary;
  })().finally(() => { activeSync = null; });
  return activeSync;
}

export function setupAutomaticSync(onComplete?: () => void): () => void {
  const handler = () => void synchronize().then(onComplete).catch(() => undefined);
  window.addEventListener('online', handler);
  if (navigator.onLine) handler();
  return () => window.removeEventListener('online', handler);
}
