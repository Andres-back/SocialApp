import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AthleteRecord } from '@socialapp/shared';
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
});
