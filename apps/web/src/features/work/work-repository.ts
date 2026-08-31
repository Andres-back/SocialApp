import type { AlertData, AthleteWorkspace, FollowUpCaseData, FollowUpCaseInput, FollowUpEntryInput, NetworkDiagramData, ProfessionalObservationData, ScreeningCampaignData, ScreeningCampaignInput, ScreeningInstrumentData, SocioeconomicAssessmentData, SocioeconomicAssessmentInput } from '@socialapp/shared';
import { api, ApiRequestError } from '../../lib/api';
import { db, type LocalMutation } from '../../lib/db';
import { synchronize } from '../../lib/sync-engine';
import { createId } from '../../lib/uuid';

async function queue(entityType: string, entityId: string, payload: unknown, baseVersion: number, operation: LocalMutation['operation'] = 'create') {
  await db.syncQueue.put({ mutationId: createId(), entityType, entityId, operation, baseVersion, occurredAt: new Date().toISOString(), payload, status: 'pending', attempts: 0 });
}
function syncSoon() { if (navigator.onLine) void synchronize().catch(() => undefined); }

function belongsToCampaign(mutation: LocalMutation, campaignId: string, participantIds: Set<string>): boolean {
  if (mutation.entityType === 'campaign') return mutation.entityId === campaignId;
  if (mutation.entityType !== 'screening-result') return false;
  const payloadCampaignId = (mutation.payload as { campaignId?: string } | null)?.campaignId;
  return payloadCampaignId === campaignId || participantIds.has(mutation.entityId);
}

export async function loadWorkspace(athleteId: string): Promise<AthleteWorkspace> {
  if (navigator.onLine) {
    try {
      const data = await api.getWorkspace(athleteId);
      await db.transaction('rw', [db.socioeconomicAssessments, db.alerts, db.followUps, db.observations, db.diagrams], async () => {
        if (data.socioeconomicAssessment) await db.socioeconomicAssessments.put({ ...data.socioeconomicAssessment, syncStatus: 'synced' });
        await db.alerts.bulkPut(data.alerts.map((item) => ({ ...item, syncStatus: 'synced' as const })));
        await db.followUps.bulkPut(data.followUps.map((item) => ({ ...item, syncStatus: 'synced' as const })));
        await db.observations.bulkPut(data.observations.map((item) => ({ ...item, syncStatus: 'synced' as const })));
        if (data.genogram) await db.diagrams.put({ ...data.genogram, diagramType: 'genogram', syncStatus: 'synced' });
        if (data.ecomap) await db.diagrams.put({ ...data.ecomap, diagramType: 'ecomap', syncStatus: 'synced' });
      });
      return data;
    } catch { /* local replica follows */ }
  }
  const [assessment, alerts, followUps, observations, genogram, ecomap] = await Promise.all([
    db.socioeconomicAssessments.where('athleteId').equals(athleteId).last(),
    db.alerts.where('athleteId').equals(athleteId).toArray(),
    db.followUps.where('athleteId').equals(athleteId).toArray(),
    db.observations.where('athleteId').equals(athleteId).toArray(),
    db.diagrams.where({ athleteId, diagramType: 'genogram' }).last(),
    db.diagrams.where({ athleteId, diagramType: 'ecomap' }).last(),
  ]);
  return { socioeconomicAssessment: assessment ?? null, alerts, followUps, observations, genogram: genogram ?? null, ecomap: ecomap ?? null, timeline: [] };
}

export async function saveAssessmentOffline(input: SocioeconomicAssessmentInput): Promise<SocioeconomicAssessmentData> {
  const existing = await db.socioeconomicAssessments.get(input.id);
  const now = new Date().toISOString();
  const record = { ...input, createdAt: existing?.createdAt ?? now, updatedAt: now, syncStatus: 'pending' as const };
  await db.transaction('rw', db.socioeconomicAssessments, db.syncQueue, async () => { await db.socioeconomicAssessments.put(record); await queue('socioeconomic-assessment', input.id, input, input.version, existing ? 'update' : 'create'); });
  syncSoon(); return record;
}
export async function saveAlertOffline(input: AlertData) {
  const existing = await db.alerts.get(input.id);
  const record = { ...input, updatedAt: new Date().toISOString(), syncStatus: 'pending' as const };
  await db.transaction('rw', db.alerts, db.syncQueue, async () => { await db.alerts.put(record); await queue('alert', input.id, input, input.version, existing ? 'update' : 'create'); });
  syncSoon(); return record;
}
export async function saveFollowUpOffline(input: FollowUpCaseInput): Promise<FollowUpCaseData> {
  const existing = await db.followUps.get(input.id); const now = new Date().toISOString();
  const record: FollowUpCaseData = { ...input, professionalName: input.responsible, entries: existing?.entries ?? [], createdAt: existing?.createdAt ?? now, updatedAt: now, syncStatus: 'pending' };
  await db.transaction('rw', db.followUps, db.syncQueue, async () => { await db.followUps.put(record); await queue('follow-up', input.id, input, input.version, existing ? 'update' : 'create'); });
  syncSoon(); return record;
}
export async function saveFollowUpEntryOffline(input: FollowUpEntryInput, professionalName: string) {
  const followUp = await db.followUps.get(input.followUpCaseId);
  if (!followUp) throw new Error('No encontramos el seguimiento en este dispositivo.');
  const entry = { ...input, professionalName, createdAt: new Date().toISOString() };
  await db.transaction('rw', db.followUps, db.syncQueue, async () => {
    await db.followUps.put({ ...followUp, status: 'IN_PROGRESS', entries: [entry, ...followUp.entries.filter((item) => item.id !== input.id)], nextAction: input.nextAction, estimatedDate: input.estimatedDate, updatedAt: new Date().toISOString(), syncStatus: 'pending' });
    await queue('follow-up-entry', input.id, input, 0);
  });
  syncSoon(); return entry;
}
export async function saveObservationOffline(input: Omit<ProfessionalObservationData, 'createdAt' | 'professionalName'>, professionalName: string) {
  const record: ProfessionalObservationData = { ...input, professionalName, createdAt: new Date().toISOString(), syncStatus: 'pending' };
  await db.transaction('rw', db.observations, db.syncQueue, async () => { await db.observations.put(record); await queue('observation', input.id, record, 0); });
  syncSoon(); return record;
}
export async function saveDiagramOffline(type: 'genogram' | 'ecomap', input: NetworkDiagramData) {
  const existing = await db.diagrams.get(input.id); const now = new Date().toISOString();
  const record = { ...input, createdAt: existing?.createdAt ?? now, updatedAt: now, diagramType: type, syncStatus: 'pending' as const };
  await db.transaction('rw', db.diagrams, db.syncQueue, async () => { await db.diagrams.put(record); await queue(type, input.id, input, input.version, existing ? 'update' : 'create'); });
  syncSoon(); return record;
}

export async function loadCampaigns(): Promise<ScreeningCampaignData[]> {
  if (navigator.onLine) try {
    const [data, local, queued] = await Promise.all([api.listCampaigns(), db.campaigns.toArray(), db.syncQueue.where('status').anyOf(['pending', 'processing', 'error', 'conflict']).toArray()]);
    const dirtyCampaignIds = new Set(queued.filter((mutation) => mutation.entityType === 'campaign').map((mutation) => mutation.entityId));
    for (const mutation of queued.filter((item) => item.entityType === 'screening-result')) {
      const owner = local.find((campaign) => campaign.participants.some((participant) => participant.id === mutation.entityId));
      if (owner) dirtyCampaignIds.add(owner.id);
    }
    const pending = new Map(local.filter((item) => dirtyCampaignIds.has(item.id)).map((item) => [item.id, item]));
    const remote = data.map((item) => ({ ...item, participants: item.participants.map((participant) => ({ ...participant, syncStatus: 'synced' as const })), syncStatus: 'synced' as const }));
    const remoteIds = new Set(remote.map((item) => item.id));
    const orphaned = local.filter((item) => !remoteIds.has(item.id) && item.version > 0);
    const orphanedIds = new Set(orphaned.map((item) => item.id));
    const orphanedParticipants = new Map(orphaned.map((item) => [item.id, new Set(item.participants.map((participant) => participant.id))]));
    const orphanedMutations = queued.filter((mutation) => [...orphanedParticipants].some(([campaignId, participants]) => belongsToCampaign(mutation, campaignId, participants)));
    await db.transaction('rw', db.campaigns, db.syncQueue, async () => {
      await db.campaigns.bulkPut(remote.filter((item) => !pending.has(item.id)));
      for (const campaign of orphaned) await db.campaigns.update(campaign.id, { syncStatus: 'conflict' });
      for (const mutation of orphanedMutations) {
        await db.syncQueue.update(mutation.mutationId, {
          status: 'conflict',
          rejectionKind: 'server',
          lastError: 'Esta brigada fue eliminada en el servidor. La copia local se conservó y ya no se enviará automáticamente.',
        });
      }
    });
    return [
      ...remote.map((item) => pending.get(item.id) ?? item),
      ...local.filter((item) => !remoteIds.has(item.id) && !orphanedIds.has(item.id)),
    ].sort((a, b) => b.date.localeCompare(a.date));
  } catch { /* offline */ }
  return db.campaigns.orderBy('date').reverse().toArray();
}
export async function loadInstruments(): Promise<ScreeningInstrumentData[]> {
  if (navigator.onLine) try {
    const data = await api.listInstruments();
    await replaceInstrumentReplica(data);
    return data;
  } catch { /* offline */ }
  return db.instruments.toArray();
}
export async function loadManageableInstruments(): Promise<ScreeningInstrumentData[]> {
  if (navigator.onLine) try {
    const data = await api.manageableInstruments();
    await replaceInstrumentReplica(data);
    return data;
  } catch { /* offline */ }
  return db.instruments.toArray();
}
async function replaceInstrumentReplica(data: ScreeningInstrumentData[]): Promise<void> {
  const remoteIds = new Set(data.map((item) => item.id));
  const staleIds = (await db.instruments.toArray()).filter((item) => !remoteIds.has(item.id)).map((item) => item.id);
  await db.transaction('rw', db.instruments, async () => {
    await db.instruments.bulkPut(data);
    await db.instruments.bulkDelete(staleIds);
  });
}
export async function saveCampaignOffline(input: ScreeningCampaignInput, instrument: ScreeningInstrumentData, athleteNames: Record<string, string>, labels?: { sportsProgramName?: string | null; sportName?: string | null }) {
  const existing = await db.campaigns.get(input.id); const now = new Date().toISOString();
  const participants = input.athleteIds.map((athleteId) => existing?.participants.find((item) => item.athleteId === athleteId) ?? { id: createId(), athleteId, athleteName: athleteNames[athleteId] ?? 'Deportista', status: 'PENDING' as const, responses: {}, version: 1, syncStatus: 'pending' as const });
  const record: ScreeningCampaignData = { ...input, instrument, participants, sportsProgramName: labels?.sportsProgramName ?? existing?.sportsProgramName ?? null, sportName: labels?.sportName ?? existing?.sportName ?? null, createdAt: existing?.createdAt ?? now, updatedAt: now, syncStatus: 'pending' };
  await db.transaction('rw', db.campaigns, db.syncQueue, async () => { await db.campaigns.put(record); await queue('campaign', input.id, input, input.version, existing ? 'update' : 'create'); });
  if (navigator.onLine) {
    try {
      await synchronize();
      return (await db.campaigns.get(input.id)) ?? record;
    } catch {
      // The local campaign remains queued for the next automatic retry.
    }
  }
  return record;
}
export async function saveScreeningProgressOffline(campaignId: string, athleteId: string, responses: Record<string, unknown>, status: 'IN_PROGRESS' | 'COMPLETED') {
  const campaign = await db.campaigns.get(campaignId); if (!campaign) throw new Error('No encontramos la brigada en este dispositivo.');
  const participant = campaign.participants.find((item) => item.athleteId === athleteId); if (!participant) throw new Error('El deportista no está asignado.');
  if (campaign.status === 'COMPLETED') throw new Error('Reabre la brigada antes de modificar este resultado.');
  const completedAt = status === 'COMPLETED' ? new Date().toISOString() : null;
  const payload = { id: participant.id, campaignId, athleteId, status, responses, completedAt, version: participant.version };
  await db.transaction('rw', db.campaigns, db.syncQueue, async () => {
    await db.campaigns.put({ ...campaign, participants: campaign.participants.map((item) => item.athleteId === athleteId ? { ...item, status, responses, completedAt, syncStatus: 'pending' } : item), updatedAt: new Date().toISOString(), syncStatus: 'pending' });
    const replaceable = await db.syncQueue.where('entityType').equals('screening-result').filter((item) => item.entityId === participant.id && ['pending', 'error'].includes(item.status)).primaryKeys();
    await db.syncQueue.bulkDelete(replaceable);
    await queue('screening-result', participant.id, payload, participant.version, 'update');
  });
  syncSoon();
}
export async function saveScreeningOffline(campaignId: string, athleteId: string, responses: Record<string, unknown>) {
  return saveScreeningProgressOffline(campaignId, athleteId, responses, 'COMPLETED');
}
export async function changeCampaignStatusOffline(campaign: ScreeningCampaignData, status: ScreeningCampaignInput['status']) {
  return saveCampaignOffline({
    id: campaign.id, name: campaign.name, date: campaign.date, place: campaign.place,
    sportsProgramId: campaign.sportsProgramId, sportId: campaign.sportId, instrumentId: campaign.instrumentId,
    professionalName: campaign.professionalName, athleteIds: campaign.participants.map((participant) => participant.athleteId), status, version: campaign.version,
  }, campaign.instrument, Object.fromEntries(campaign.participants.map((participant) => [participant.athleteId, participant.athleteName])), { sportsProgramName: campaign.sportsProgramName, sportName: campaign.sportName });
}

export async function deleteCampaignOnline(id: string): Promise<void> {
  if (!navigator.onLine) throw new Error('Conéctate para eliminar una brigada de forma segura.');
  const local = await db.campaigns.get(id);
  const participantIds = new Set(local?.participants.map((participant) => participant.id) ?? []);
  let unsynchronized = (await db.syncQueue.toArray()).filter((mutation) => belongsToCampaign(mutation, id, participantIds));
  if (unsynchronized.length > 0) {
    try { await synchronize(); } catch { /* The queue remains preserved. */ }
    unsynchronized = (await db.syncQueue.toArray()).filter((mutation) => belongsToCampaign(mutation, id, participantIds));
  }
  if (unsynchronized.length > 0) throw new Error('Esta brigada tiene cambios sin sincronizar. Resuélvelos en Sincronización antes de eliminarla.');
  try {
    await api.deleteCampaign(id);
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 404) throw error;
  }
  await db.campaigns.delete(id);
}
