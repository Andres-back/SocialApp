import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AthleteInput, SocialRecordInput, SportsCatalogs } from '@socialapp/shared';
import { api, ApiRequestError } from '../../lib/api';
import { db } from '../../lib/db';
import { loadAthlete, loadAthletes, loadSocialRecord, saveAthleteOffline, saveSocialRecordOffline } from './athlete-repository';

const catalogs: SportsCatalogs = {
  programs: [{ id: 'c3da0a9e-5871-4b22-931b-2f55ced6e59b', name: 'Escuela de formación' }],
  sports: [{ id: 'fbfc8366-8159-44b5-b5ce-0b835864325d', name: 'Natación' }],
  categories: [{ id: '971eec52-21ef-49d8-a29e-98baf047136a', name: '10 a 13 años' }],
  coaches: [],
};
const athlete: AthleteInput = {
  id: 'f6c4d707-0b58-4bc7-b830-dfa046897caa', internalCode: 'DEP-OFFLINE', documentType: 'IDENTITY_CARD',
  documentNumber: 'TEST-OFFLINE', firstNames: 'Ana', lastNames: 'Prueba', birthDate: '2015-04-12', sex: 'FEMALE',
  municipality: 'Municipio de prueba', zone: 'URBAN', sportsProgramId: catalogs.programs[0]!.id, sportId: catalogs.sports[0]!.id,
  categoryId: catalogs.categories[0]!.id, coachId: null, joinedAt: '2026-01-01', status: 'ACTIVE',
  schoolName: null, schoolGrade: null, schoolShift: null, currentlyEnrolled: true,
  guardian: { name: 'Madre de Prueba', relationship: 'Madre', phone: '3000000000', email: null }, version: 0,
};

describe('athlete offline repository', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await db.delete();
  });

  it('stores an athlete and its mutation atomically while offline', async () => {
    const saved = await saveAthleteOffline(athlete, catalogs);
    expect(saved.sportName).toBe('Natación');
    expect((await db.athletes.get(athlete.id))?.syncStatus).toBe('pending');
    expect(await db.syncQueue.where('entityType').equals('athlete').count()).toBe(1);
  });

  it('links a completed social record to the local population control', async () => {
    await saveAthleteOffline(athlete, catalogs);
    const social: SocialRecordInput = {
      id: '3ccad34e-095d-4bf6-9a5d-92d20386d6db', athleteId: athlete.id, instrumentVersion: 1, status: 'COMPLETED',
      livingWith: ['MOTHER'], householdMembers: [], primaryCaregiver: 'MOTHER', familyRelationships: 'GOOD',
      supportNetworks: ['FAMILY'], completedAt: new Date().toISOString(), version: 0,
    };
    await saveSocialRecordOffline(social);
    expect((await db.athletes.get(athlete.id))?.hasSocialRecord).toBe(true);
    expect(await db.syncQueue.where('entityType').equals('social-record').count()).toBe(1);
  });

  it('keeps a pending local social record visible while the server still returns none', async () => {
    await saveAthleteOffline(athlete, catalogs);
    const social: SocialRecordInput = {
      id: '3ccad34e-095d-4bf6-9a5d-92d20386d6db', athleteId: athlete.id, instrumentVersion: 1, status: 'COMPLETED',
      livingWith: ['MOTHER'], householdMembers: [], primaryCaregiver: 'MOTHER', familyRelationships: 'GOOD',
      supportNetworks: ['FAMILY'], completedAt: new Date().toISOString(), version: 0,
    };
    await saveSocialRecordOffline(social);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    const request = vi.spyOn(api, 'getSocialRecord').mockResolvedValue(null);

    expect((await loadSocialRecord(athlete.id))?.id).toBe(social.id);
    request.mockRestore();
  });

  it('removes a stale synced athlete after the server no longer lists it', async () => {
    await saveAthleteOffline(athlete, catalogs);
    await db.athletes.update(athlete.id, { syncStatus: 'synced' });
    await db.syncQueue.clear();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.spyOn(api, 'listAthletes').mockResolvedValue([]);

    expect(await loadAthletes()).toEqual([]);
    expect(await db.athletes.get(athlete.id)).toBeUndefined();
  });

  it('keeps an unsynchronized local athlete when the server list does not contain it yet', async () => {
    await saveAthleteOffline(athlete, catalogs);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.spyOn(api, 'listAthletes').mockResolvedValue([]);

    expect(await loadAthletes()).toHaveLength(1);
    expect(await db.athletes.get(athlete.id)).toMatchObject({ syncStatus: 'pending' });
  });

  it('drops a stale synced athlete when its detail endpoint returns 404', async () => {
    await saveAthleteOffline(athlete, catalogs);
    await db.athletes.update(athlete.id, { syncStatus: 'synced' });
    await db.syncQueue.clear();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.spyOn(api, 'getAthlete').mockRejectedValue(new ApiRequestError('No encontramos este deportista.', 404));

    expect(await loadAthlete(athlete.id)).toBeUndefined();
    expect(await db.athletes.get(athlete.id)).toBeUndefined();
  });
});
