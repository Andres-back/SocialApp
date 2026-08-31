import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AthleteRecord, ScreeningCampaignData } from '@socialapp/shared';
import { api } from './api';
import { db } from './db';
import { synchronize } from './sync-engine';

vi.mock('./api', () => ({
  api: {
    health: vi.fn(),
    pushMutations: vi.fn(),
  },
}));

const athlete: AthleteRecord = {
  id: 'bb48db7f-f0b8-4bbc-a6e3-00c5a049d168',
  internalCode: 'DEP-SYNC',
  documentType: 'IDENTITY_CARD',
  documentNumber: 'SYNC-TEST',
  firstNames: 'Valentina',
  lastNames: 'Prueba',
  birthDate: '2014-06-15',
  age: 12,
  sex: 'FEMALE',
  municipality: 'Municipio QA',
  zone: 'URBAN',
  sportsProgramId: 'aeeb4ce5-379c-4f84-a093-fe866d344c09',
  sportsProgramName: 'Escuela de formación',
  sportId: '915e01bb-c3dd-40fb-8eae-c876bfa8fa15',
  sportName: 'Natación',
  categoryId: '2bf97685-c5d6-4140-8b6e-d98948f65779',
  categoryName: '10 a 13 años',
  coachId: null,
  coachName: null,
  joinedAt: '2026-08-27',
  status: 'ACTIVE',
  schoolName: null,
  schoolGrade: null,
  schoolShift: null,
  currentlyEnrolled: true,
  guardian: { name: 'Acudiente Prueba', relationship: 'Madre', phone: '3001234567', email: null },
  hasSocialRecord: false,
  socialRecordUpdatedAt: null,
  createdAt: '2026-08-27T00:00:00.000Z',
  updatedAt: '2026-08-27T00:00:00.000Z',
  version: 0,
  syncStatus: 'pending',
};

describe('sync engine', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.mocked(api.health).mockResolvedValue({ status: 'ok' });
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await db.delete();
  });

  it('updates the local entity and removes its mutation after server acceptance', async () => {
    const mutationId = '0cce566b-ea53-4c5f-95d1-f3399c722559';
    await db.athletes.put(athlete);
    await db.syncQueue.put({
      mutationId,
      entityType: 'athlete',
      entityId: athlete.id,
      operation: 'create',
      baseVersion: 0,
      occurredAt: athlete.updatedAt,
      payload: athlete,
      status: 'pending',
      attempts: 0,
    });
    vi.mocked(api.pushMutations).mockResolvedValue({
      results: [{ mutationId, status: 'accepted', serverVersion: 1 }],
      serverTime: '2026-08-27T00:00:01.000Z',
    });

    await expect(synchronize()).resolves.toMatchObject({ pending: 0, errors: 0, conflicts: 0 });
    expect(await db.syncQueue.count()).toBe(0);
    expect(await db.athletes.get(athlete.id)).toMatchObject({ version: 1, syncStatus: 'synced' });
  });

  it('advances the nested participant version after a screening result is accepted', async () => {
    const mutationId = crypto.randomUUID();
    const participantId = crypto.randomUUID();
    const campaign: ScreeningCampaignData = {
      id: crypto.randomUUID(), name: 'Brigada QA', date: '2026-08-27', place: 'Sede QA', instrumentId: 'instrument-1',
      professionalName: 'Laura', athleteIds: [athlete.id], status: 'ACTIVE', version: 1,
      instrument: { id: 'instrument-1', name: 'Preventivo', version: 1, active: true, questions: [{ id: 'q1', dimension: 'Apoyo', prompt: '¿Cuenta con apoyo?', type: 'YES_NO', options: ['Sí', 'No'], required: true, position: 1 }] },
      participants: [{ id: participantId, athleteId: athlete.id, athleteName: 'Valentina Prueba', status: 'IN_PROGRESS', responses: { q1: 'Sí' }, version: 1, syncStatus: 'pending' }],
      createdAt: athlete.createdAt, updatedAt: athlete.updatedAt, syncStatus: 'pending',
    };
    await db.campaigns.put(campaign);
    await db.syncQueue.put({ mutationId, entityType: 'screening-result', entityId: participantId, operation: 'update', baseVersion: 1, occurredAt: athlete.updatedAt, payload: { id: participantId, campaignId: campaign.id, athleteId: athlete.id, status: 'IN_PROGRESS', responses: { q1: 'Sí' }, version: 1 }, status: 'pending', attempts: 0 });
    vi.mocked(api.pushMutations).mockResolvedValue({ results: [{ mutationId, status: 'accepted', serverVersion: 2 }], serverTime: '2026-08-27T00:00:01.000Z' });

    await synchronize();

    expect((await db.campaigns.get(campaign.id))?.participants[0]).toMatchObject({ version: 2, syncStatus: 'synced' });
    expect(await db.syncQueue.count()).toBe(0);
  });

  it('recovers a mutation left processing after an interrupted page lifecycle', async () => {
    const mutationId = crypto.randomUUID();
    await db.athletes.put(athlete);
    await db.syncQueue.put({ mutationId, entityType: 'athlete', entityId: athlete.id, operation: 'create', baseVersion: 0, occurredAt: athlete.updatedAt, payload: athlete, status: 'processing', attempts: 0 });
    vi.mocked(api.pushMutations).mockResolvedValue({ results: [{ mutationId, status: 'accepted', serverVersion: 1 }], serverTime: '2026-08-27T00:00:01.000Z' });

    await synchronize();

    expect(await db.syncQueue.count()).toBe(0);
  });

  it('sends consecutive edits of the same athlete in order with the updated server version', async () => {
    const firstMutationId = crypto.randomUUID();
    const secondMutationId = crypto.randomUUID();
    await db.athletes.put({ ...athlete, firstNames: 'Valentina final' });
    await db.syncQueue.bulkPut([
      { mutationId: firstMutationId, entityType: 'athlete', entityId: athlete.id, operation: 'update', baseVersion: 0, occurredAt: '2026-08-27T00:00:01.000Z', payload: { ...athlete, firstNames: 'Valentina inicial' }, status: 'pending', attempts: 0 },
      { mutationId: secondMutationId, entityType: 'athlete', entityId: athlete.id, operation: 'update', baseVersion: 0, occurredAt: '2026-08-27T00:00:02.000Z', payload: { ...athlete, firstNames: 'Valentina final' }, status: 'pending', attempts: 0 },
    ]);
    vi.mocked(api.pushMutations)
      .mockResolvedValueOnce({ results: [{ mutationId: firstMutationId, status: 'accepted', serverVersion: 1 }], serverTime: '2026-08-27T00:00:03.000Z' })
      .mockResolvedValueOnce({ results: [{ mutationId: secondMutationId, status: 'accepted', serverVersion: 2 }], serverTime: '2026-08-27T00:00:04.000Z' });

    await synchronize();

    expect(api.pushMutations).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.pushMutations).mock.calls[0]![0]).toHaveLength(1);
    expect(vi.mocked(api.pushMutations).mock.calls[1]![0][0]).toMatchObject({ mutationId: secondMutationId, baseVersion: 1, payload: expect.objectContaining({ version: 1 }) });
    expect(await db.athletes.get(athlete.id)).toMatchObject({ firstNames: 'Valentina final', version: 2, syncStatus: 'synced' });
    expect(await db.syncQueue.count()).toBe(0);
  });
});
