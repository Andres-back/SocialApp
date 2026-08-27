import type { AlertData, AthleteWorkspace, FollowUpCaseData, FollowUpCaseInput, FollowUpEntryInput, NetworkDiagramData, ProfessionalObservationData, ScreeningCampaignData, ScreeningCampaignInput, ScreeningInstrumentData, SocioeconomicAssessmentData, SocioeconomicAssessmentInput } from '@socialapp/shared';
import { api } from '../../lib/api';
import { db, type LocalMutation } from '../../lib/db';
import { synchronize } from '../../lib/sync-engine';

async function queue(entityType: string, entityId: string, payload: unknown, baseVersion: number, operation: LocalMutation['operation'] = 'create') {
  await db.syncQueue.put({ mutationId: crypto.randomUUID(), entityType, entityId, operation, baseVersion, occurredAt: new Date().toISOString(), payload, status: 'pending', attempts: 0 });
}
function syncSoon() { if (navigator.onLine) void synchronize().catch(() => undefined); }

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
  if (navigator.onLine) try { const data = await api.listCampaigns(); await db.campaigns.bulkPut(data.map((item) => ({ ...item, syncStatus: 'synced' as const }))); return data; } catch { /* offline */ }
  return db.campaigns.orderBy('date').reverse().toArray();
}
export async function loadInstruments(): Promise<ScreeningInstrumentData[]> {
  if (navigator.onLine) try { const data = await api.listInstruments(); await db.instruments.bulkPut(data); return data; } catch { /* offline */ }
  return db.instruments.toArray();
}
export async function saveCampaignOffline(input: ScreeningCampaignInput, instrument: ScreeningInstrumentData, athleteNames: Record<string, string>) {
  const existing = await db.campaigns.get(input.id); const now = new Date().toISOString();
  const participants = input.athleteIds.map((athleteId) => existing?.participants.find((item) => item.athleteId === athleteId) ?? { id: crypto.randomUUID(), athleteId, athleteName: athleteNames[athleteId] ?? 'Deportista', status: 'PENDING' as const, responses: {} });
  const record: ScreeningCampaignData = { ...input, instrument, participants, createdAt: existing?.createdAt ?? now, updatedAt: now, syncStatus: 'pending' };
  await db.transaction('rw', db.campaigns, db.syncQueue, async () => { await db.campaigns.put(record); await queue('campaign', input.id, input, input.version, existing ? 'update' : 'create'); });
  syncSoon(); return record;
}
export async function saveScreeningOffline(campaignId: string, athleteId: string, responses: Record<string, unknown>) {
  const campaign = await db.campaigns.get(campaignId); if (!campaign) throw new Error('No encontramos la brigada en este dispositivo.');
  const participant = campaign.participants.find((item) => item.athleteId === athleteId); if (!participant) throw new Error('El deportista no está asignado.');
  const payload = { id: participant.id, campaignId, athleteId, status: 'COMPLETED', responses, completedAt: new Date().toISOString(), version: 1 };
  await db.transaction('rw', db.campaigns, db.syncQueue, async () => {
    await db.campaigns.put({ ...campaign, participants: campaign.participants.map((item) => item.athleteId === athleteId ? { ...item, status: 'COMPLETED', responses, completedAt: payload.completedAt } : item), updatedAt: new Date().toISOString(), syncStatus: 'pending' });
    await queue('screening-result', participant.id, payload, 1, 'update');
  });
  syncSoon();
}
