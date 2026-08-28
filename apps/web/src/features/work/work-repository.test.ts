import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScreeningCampaignData, ScreeningCampaignInput, ScreeningInstrumentData, SocioeconomicAssessmentInput } from '@socialapp/shared';
import { api } from '../../lib/api';
import { db } from '../../lib/db';
import { loadCampaigns, saveAssessmentOffline, saveCampaignOffline, saveFollowUpOffline, saveScreeningProgressOffline } from './work-repository';

describe('offline social work repository', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await db.delete();
  });

  it('stores a socioeconomic assessment and its pending mutation atomically', async () => {
    const input: SocioeconomicAssessmentInput = {
      id: crypto.randomUUID(), athleteId: crypto.randomUUID(), instrumentVersion: 1, status: 'COMPLETED',
      housingType: 'HOUSE', housingTenure: 'RENTED', bedrooms: 2, householdSize: 4, zone: 'URBAN',
      utilities: ['ELECTRICITY', 'POTABLE_WATER'], exclusiveKitchen: true, transportMode: 'PUBLIC_TRANSPORT',
      travelTime: 'FROM_31_TO_60', transportDifficulty: 'FREQUENTLY', foodReduction: 'SOMETIMES',
      foodBeforeTraining: 'SOMETIMES', incomeRange: 'UNDER_1_SMMLV', dependents: 3,
      informedObservation: 'Dato ficticio', professionalAssessment: 'Valoración ficticia', completedAt: new Date().toISOString(), version: 0,
    };
    await saveAssessmentOffline(input);
    expect((await db.socioeconomicAssessments.get(input.id))?.syncStatus).toBe('pending');
    expect(await db.syncQueue.where('entityType').equals('socioeconomic-assessment').count()).toBe(1);
  });

  it('stores follow-up cases for field work', async () => {
    const id = crypto.randomUUID();
    await saveFollowUpOffline({ id, athleteId: crypto.randomUUID(), motive: 'Transporte', priority: 'HIGH', status: 'OPEN', responsible: 'Laura Martínez', nextAction: 'Contactar familia', estimatedDate: '2026-09-01', version: 0 });
    expect(await db.followUps.get(id)).toMatchObject({ status: 'OPEN', priority: 'HIGH', syncStatus: 'pending' });
  });

  it('downloads a campaign structure to the local replica before field work', async () => {
    const instrument: ScreeningInstrumentData = { id: crypto.randomUUID(), name: 'Preventivo', version: 1, active: true, questions: [{ id: crypto.randomUUID(), dimension: 'Apoyo', prompt: '¿Cuenta con apoyo?', type: 'YES_NO', options: ['Sí','No'], required: true, position: 1 }] };
    const athleteId = crypto.randomUUID();
    const input: ScreeningCampaignInput = { id: crypto.randomUUID(), name: 'Brigada QA', date: '2026-08-27', place: 'Lugar QA', instrumentId: instrument.id, professionalName: 'Laura', athleteIds: [athleteId], status: 'ACTIVE', version: 0 };
    await saveCampaignOffline(input, instrument, { [athleteId]: 'Deportista QA' });
    const saved = await db.campaigns.get(input.id);
    expect(saved?.participants[0]).toMatchObject({ athleteName: 'Deportista QA', status: 'PENDING' });
    expect(await db.syncQueue.where('entityType').equals('campaign').count()).toBe(1);
  });

  it('keeps partial screening answers and coalesces pending mutations', async () => {
    const instrument: ScreeningInstrumentData = { id: crypto.randomUUID(), name: 'Preventivo', version: 1, active: true, questions: [{ id: 'q1', dimension: 'Apoyo', prompt: '¿Cuenta con apoyo?', type: 'YES_NO', options: ['Sí','No'], required: true, position: 1 }] };
    const athleteId = crypto.randomUUID();
    const campaignId = crypto.randomUUID();
    await saveCampaignOffline({ id: campaignId, name: 'Brigada QA', date: '2026-08-27', place: 'Lugar QA', instrumentId: instrument.id, professionalName: 'Laura', athleteIds: [athleteId], status: 'ACTIVE', version: 0 }, instrument, { [athleteId]: 'Deportista QA' });
    await saveScreeningProgressOffline(campaignId, athleteId, { q1: 'Sí' }, 'IN_PROGRESS');
    await saveScreeningProgressOffline(campaignId, athleteId, { q1: 'No' }, 'IN_PROGRESS');
    const saved = await db.campaigns.get(campaignId);
    expect(saved?.participants[0]).toMatchObject({ status: 'IN_PROGRESS', responses: { q1: 'No' }, syncStatus: 'pending' });
    expect(await db.syncQueue.where('entityType').equals('screening-result').count()).toBe(1);
  });

  it('removes a stale synced campaign after it was deleted on the server', async () => {
    const campaign = {
      id: crypto.randomUUID(), name: 'Brigada retirada', date: '2026-08-27', place: 'Lugar QA', instrumentId: crypto.randomUUID(),
      professionalName: 'Laura', athleteIds: [], status: 'ACTIVE', version: 1,
      instrument: { id: crypto.randomUUID(), name: 'Preventivo', version: 1, active: true, questions: [] },
      participants: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), syncStatus: 'synced',
    } satisfies ScreeningCampaignData;
    await db.campaigns.put(campaign);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.spyOn(api, 'listCampaigns').mockResolvedValue([]);

    expect(await loadCampaigns()).toEqual([]);
    expect(await db.campaigns.get(campaign.id)).toBeUndefined();
  });
});
