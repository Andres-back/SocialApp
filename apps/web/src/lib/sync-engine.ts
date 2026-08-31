import type { AthleteInput, AthleteRecord, SyncMutation } from '@socialapp/shared';
import { athleteFieldLabels, athleteRecordToInput, mergeConcurrentAthleteEdit, type AthleteMergeField } from '../features/athletes/athlete-merge';
import { api } from './api';
import { db, type LocalMutation } from './db';
import { createId } from './uuid';

export interface SyncSummary {
  synced: number;
  pending: number;
  errors: number;
  conflicts: number;
}

export interface SyncIssue {
  mutationId: string;
  entityType: string;
  entityId: string;
  status: 'error' | 'conflict';
  attempts: number;
  message: string;
  recoverable: boolean;
  canKeepLocal: boolean;
}

let activeSync: Promise<SyncSummary> | null = null;
const versionedEntities = new Set(['athlete', 'social-record', 'socioeconomic-assessment', 'alert', 'follow-up', 'genogram', 'ecomap', 'campaign', 'screening-result']);

interface AthleteRebasePlan {
  remote: AthleteRecord;
  merged: AthleteInput;
  localChanges: AthleteMergeField[];
  conflicts: AthleteMergeField[];
}

function mergedAthleteRecord(plan: AthleteRebasePlan, local?: AthleteRecord): AthleteRecord {
  const record: AthleteRecord = {
    ...plan.remote,
    ...plan.merged,
    guardian: plan.merged.guardian ?? plan.remote.guardian,
    version: plan.remote.version,
    syncStatus: 'pending',
  };
  if (local && plan.localChanges.includes('birthDate')) record.age = local.age;
  if (local && plan.localChanges.includes('sportsProgramId')) record.sportsProgramName = local.sportsProgramName;
  if (local && plan.localChanges.includes('sportId')) record.sportName = local.sportName;
  if (local && plan.localChanges.includes('categoryId')) record.categoryName = local.categoryName;
  if (local && plan.localChanges.includes('coachId')) record.coachName = local.coachName;
  return record;
}

async function prepareAthleteRebase(current: LocalMutation): Promise<AthleteRebasePlan | null> {
  if (current.entityType !== 'athlete' || !current.baseSnapshot) return null;
  try {
    const remote = await api.getAthlete(current.entityId);
    const result = mergeConcurrentAthleteEdit(current.baseSnapshot as AthleteInput, current.payload as AthleteInput, remote);
    return { remote, ...result };
  } catch {
    return null;
  }
}

async function executeSync(includeErrors: boolean): Promise<SyncSummary> {
  if (!navigator.onLine) throw new Error('Sin conexión. Tus cambios siguen guardados en este dispositivo.');

  await api.health();
  await db.syncQueue.where('status').equals('processing').modify({ status: 'pending' });
  const candidates = await db.syncQueue.where('status').anyOf(includeErrors ? ['pending', 'error'] : ['pending']).toArray();
  candidates.sort((left, right) => {
    if (left.status !== right.status) return left.status === 'pending' ? -1 : 1;
    return left.occurredAt.localeCompare(right.occurredAt);
  });
  const entityHeads = new Set<string>();
  const batch = candidates.filter((item) => {
    const key = `${item.entityType}:${item.entityId}`;
    if (entityHeads.has(key)) return false;
    entityHeads.add(key);
    return true;
  }).slice(0, 50);
  if (batch.length === 0) return summarize();

  await db.transaction('rw', db.syncQueue, async () => {
    await Promise.all(batch.map((item) => db.syncQueue.update(item.mutationId, { status: 'processing' })));
  });

  let accepted = 0;
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
    const athleteRebases = new Map<string, AthleteRebasePlan>();
    for (const result of response.results) {
      if (result.status !== 'conflict') continue;
      const current = batch.find((item) => item.mutationId === result.mutationId);
      if (!current) continue;
      const plan = await prepareAthleteRebase(current);
      if (plan) athleteRebases.set(result.mutationId, plan);
    }
    await db.transaction('rw', [db.syncQueue, db.athletes, db.socialRecords, db.socioeconomicAssessments, db.alerts, db.followUps, db.observations, db.diagrams, db.campaigns], async () => {
      for (const result of response.results) {
        const current = batch.find((item) => item.mutationId === result.mutationId);
        if (!current) continue;
        if (result.status === 'accepted') {
          accepted += 1;
          const subsequent = await db.syncQueue.where('entityType').equals(current.entityType)
            .filter((item) => item.entityId === current.entityId && item.mutationId !== current.mutationId && item.status === 'pending')
            .toArray();
          const localStatus = subsequent.length > 0 ? 'pending' as const : 'synced' as const;
          if (versionedEntities.has(current.entityType) && result.serverVersion !== undefined) {
            for (const next of subsequent) {
              await db.syncQueue.update(next.mutationId, {
                baseVersion: result.serverVersion,
                payload: { ...(next.payload as Record<string, unknown>), version: result.serverVersion },
              });
            }
          }
          if (current.entityType === 'athlete') {
            await db.athletes.update(current.entityId, { version: result.serverVersion ?? 1, syncStatus: localStatus });
          }
          if (current.entityType === 'social-record') {
            await db.socialRecords.update(current.entityId, { version: result.serverVersion ?? 1, syncStatus: localStatus });
          }
          if (current.entityType === 'socioeconomic-assessment') await db.socioeconomicAssessments.update(current.entityId, { version: result.serverVersion ?? 1, syncStatus: localStatus });
          if (current.entityType === 'alert') await db.alerts.update(current.entityId, { version: result.serverVersion ?? 1, syncStatus: localStatus });
          if (current.entityType === 'follow-up') await db.followUps.update(current.entityId, { version: result.serverVersion ?? 1, syncStatus: localStatus });
          if (current.entityType === 'observation') await db.observations.update(current.entityId, { syncStatus: localStatus });
          if (current.entityType === 'genogram' || current.entityType === 'ecomap') await db.diagrams.update(current.entityId, { version: result.serverVersion ?? 1, syncStatus: localStatus });
          if (current.entityType === 'campaign') {
            const campaign = await db.campaigns.get(current.entityId);
            if (campaign) await db.campaigns.put({ ...campaign, version: result.serverVersion ?? 1, syncStatus: localStatus, participants: campaign.participants.map((participant) => ({ ...participant, syncStatus: localStatus })) });
          }
          if (current.entityType === 'screening-result') {
            const campaigns = await db.campaigns.toArray();
            const campaign = campaigns.find((item) => item.participants.some((participant) => participant.id === current.entityId));
            if (campaign) {
              const version = result.serverVersion ?? 1;
              const participants = campaign.participants.map((participant) => participant.id === current.entityId ? { ...participant, version, syncStatus: localStatus } : participant);
              await db.campaigns.put({ ...campaign, syncStatus: participants.every((participant) => !participant.syncStatus || participant.syncStatus === 'synced') ? 'synced' : 'pending', participants });
            }
          }
          await db.syncQueue.delete(result.mutationId);
        } else {
          const rebase = athleteRebases.get(result.mutationId);
          if (result.status === 'conflict' && rebase && rebase.conflicts.length === 0) {
            const local = await db.athletes.get(current.entityId);
            await db.syncQueue.delete(current.mutationId);
            await db.syncQueue.put({
              ...current,
              mutationId: createId(),
              baseVersion: rebase.remote.version,
              occurredAt: new Date().toISOString(),
              payload: rebase.merged,
              baseSnapshot: athleteRecordToInput(rebase.remote),
              status: 'pending',
              attempts: 0,
              lastError: undefined,
              nextAttemptAt: undefined,
              rejectionKind: undefined,
            });
            await db.athletes.put(mergedAthleteRecord(rebase, local));
            continue;
          }
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
            lastError: rebase?.conflicts.length
              ? `Otra persona cambió también: ${rebase.conflicts.map((field) => athleteFieldLabels[field]).join(', ')}. Elige qué versión conservar.`
              : result.message,
            rejectionKind: 'server',
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
          rejectionKind: 'transport',
        }),
      ),
    );
    throw new Error('No fue posible sincronizar en este momento. Tu información permanece guardada en el dispositivo.');
  }
  return summarize(accepted);
}

async function summarize(synced = 0): Promise<SyncSummary> {
  const all = await db.syncQueue.toArray();
  return {
    synced,
    pending: all.filter((item) => item.status === 'pending' || item.status === 'processing').length,
    errors: all.filter((item) => item.status === 'error').length,
    conflicts: all.filter((item) => item.status === 'conflict').length,
  };
}

export function synchronize(): Promise<SyncSummary> {
  if (!activeSync) activeSync = (async () => {
    let summary = await executeSync(true);
    let totalSynced = summary.synced;
    while (await db.syncQueue.where('status').equals('pending').count()) {
      summary = await executeSync(false);
      totalSynced += summary.synced;
    }
    return { ...summary, synced: totalSynced };
  })().finally(() => { activeSync = null; });
  return activeSync;
}

export function setupAutomaticSync(onComplete?: () => void): () => void {
  const handler = () => {
    if (!navigator.onLine) return;
    void synchronize().then(() => {
      onComplete?.();
      window.dispatchEvent(new Event('socialapp:remote-refresh'));
    }).catch(() => onComplete?.());
  };
  const visibleHandler = () => { if (document.visibilityState === 'visible') handler(); };
  window.addEventListener('online', handler);
  window.addEventListener('focus', handler);
  document.addEventListener('visibilitychange', visibleHandler);
  const timer = window.setInterval(handler, 30_000);
  handler();
  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('focus', handler);
    document.removeEventListener('visibilitychange', visibleHandler);
    window.clearInterval(timer);
  };
}

export async function listSyncIssues(): Promise<SyncIssue[]> {
  const items = await db.syncQueue.where('status').anyOf(['error', 'conflict']).toArray();
  return items.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).map((item) => ({
    mutationId: item.mutationId,
    entityType: item.entityType,
    entityId: item.entityId,
    status: item.status as 'error' | 'conflict',
    attempts: item.attempts,
    message: item.lastError || (item.status === 'conflict' ? 'Existe una versión más reciente en el servidor.' : 'El servidor no aceptó este cambio.'),
    recoverable: item.status === 'error' && item.rejectionKind !== 'server',
    canKeepLocal: item.entityType === 'athlete' && item.status === 'conflict' && Boolean(item.baseSnapshot),
  }));
}

export async function retrySyncIssue(mutationId: string): Promise<void> {
  await db.syncQueue.update(mutationId, { status: 'pending', lastError: undefined, nextAttemptAt: undefined, rejectionKind: undefined });
}

export async function discardSyncIssue(mutationId: string): Promise<void> {
  const mutation = await db.syncQueue.get(mutationId);
  let remote: AthleteRecord | null = null;
  if (navigator.onLine && mutation?.entityType === 'athlete') {
    try { remote = await api.getAthlete(mutation.entityId); } catch { /* Refresh on the next visit. */ }
  }
  await db.transaction('rw', db.syncQueue, db.athletes, async () => {
    await db.syncQueue.delete(mutationId);
    if (remote) await db.athletes.put({ ...remote, syncStatus: 'synced' });
  });
  window.dispatchEvent(new Event('socialapp:remote-refresh'));
}

export async function keepLocalAthleteConflict(mutationId: string): Promise<void> {
  const current = await db.syncQueue.get(mutationId);
  if (!current || current.entityType !== 'athlete' || !current.baseSnapshot) throw new Error('Este conflicto ya no está disponible.');
  const plan = await prepareAthleteRebase(current);
  if (!plan) throw new Error('No fue posible cargar la versión más reciente del deportista.');
  const local = await db.athletes.get(current.entityId);
  await db.transaction('rw', db.syncQueue, db.athletes, async () => {
    await db.syncQueue.delete(current.mutationId);
    await db.syncQueue.put({
      ...current,
      mutationId: createId(),
      baseVersion: plan.remote.version,
      occurredAt: new Date().toISOString(),
      payload: plan.merged,
      baseSnapshot: athleteRecordToInput(plan.remote),
      status: 'pending',
      attempts: 0,
      lastError: undefined,
      nextAttemptAt: undefined,
      rejectionKind: undefined,
    });
    await db.athletes.put(mergedAthleteRecord(plan, local));
  });
}
