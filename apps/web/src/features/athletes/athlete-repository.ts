import type { AthleteInput, AthleteRecord, SocialRecordData, SocialRecordInput, SportsCatalogs } from '@socialapp/shared';
import { api, ApiRequestError } from '../../lib/api';
import { db } from '../../lib/db';
import { synchronize } from '../../lib/sync-engine';

function ageFromDate(value: string) {
  const today = new Date();
  const birth = new Date(`${value}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

export async function loadCatalogs(): Promise<SportsCatalogs> {
  const local = await db.catalogs.get('sports');
  if (navigator.onLine) {
    try {
      const data = await api.getSportsCatalogs();
      await db.catalogs.put({ key: 'sports', data, updatedAt: new Date().toISOString() });
      return data;
    } catch {
      if (local) return local.data;
      throw new Error('No fue posible cargar los catálogos. Conéctate una vez antes de trabajar en campo.');
    }
  }
  if (!local) throw new Error('Los catálogos todavía no están disponibles en este dispositivo.');
  return local.data;
}

export async function loadAthletes(search = ''): Promise<AthleteRecord[]> {
  if (navigator.onLine) {
    try {
      const remote = await api.listAthletes(search);
      if (!search) {
        const [local, queued] = await Promise.all([
          db.athletes.toArray(),
          db.syncQueue.where('entityType').equals('athlete').filter((item) => ['pending', 'processing', 'error', 'conflict'].includes(item.status)).toArray(),
        ]);
        const dirtyIds = new Set(queued.map((item) => item.entityId));
        const remoteIds = new Set(remote.map((item) => item.id));
        const staleIds = local
          .filter((item) => !remoteIds.has(item.id) && !dirtyIds.has(item.id) && (!item.syncStatus || item.syncStatus === 'synced'))
          .map((item) => item.id);
        await db.transaction('rw', db.athletes, async () => {
          await db.athletes.bulkPut(remote.filter((item) => !dirtyIds.has(item.id)).map((item) => ({ ...item, syncStatus: 'synced' as const })));
          await db.athletes.bulkDelete(staleIds);
        });
      } else {
        await db.athletes.bulkPut(remote.map((item) => ({ ...item, syncStatus: 'synced' as const })));
      }
    } catch {
      // The local replica remains available.
    }
  }
  const term = search.trim().toLocaleLowerCase('es');
  const all = await db.athletes.orderBy('lastNames').toArray();
  return term
    ? all.filter((item) => [item.firstNames, item.lastNames, item.internalCode, item.documentNumber ?? ''].some((value) => value.toLocaleLowerCase('es').includes(term)))
    : all;
}

export async function loadAthlete(id: string): Promise<AthleteRecord | undefined> {
  let local = await db.athletes.get(id);
  if (navigator.onLine) {
    if (local?.syncStatus && local.syncStatus !== 'synced') {
      try {
        await synchronize();
        local = await db.athletes.get(id);
      } catch {
        // The local record remains usable while synchronization is retried.
      }
    }
    try {
      const remote = await api.getAthlete(id);
      const item = { ...remote, syncStatus: 'synced' as const };
      await db.athletes.put(item);
      return item;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404 && (!local?.syncStatus || local.syncStatus === 'synced')) {
        await db.athletes.delete(id);
        return undefined;
      }
      // Fall back to the authorized local replica.
    }
  }
  return local;
}

export async function saveAthleteOffline(input: AthleteInput, catalogs: SportsCatalogs): Promise<AthleteRecord> {
  const existing = await db.athletes.get(input.id);
  const now = new Date().toISOString();
  const findName = (items: { id: string; name: string }[], id?: string | null) => items.find((item) => item.id === id)?.name ?? null;
  const record: AthleteRecord = {
    ...input,
    guardian: input.guardian ?? existing?.guardian ?? { name: '', relationship: '', phone: '', email: null },
    age: ageFromDate(input.birthDate),
    sportsProgramName: findName(catalogs.programs, input.sportsProgramId) ?? '',
    sportName: findName(catalogs.sports, input.sportId) ?? '',
    categoryName: findName(catalogs.categories, input.categoryId) ?? '',
    coachName: findName(catalogs.coaches, input.coachId),
    hasSocialRecord: existing?.hasSocialRecord ?? false,
    socialRecordUpdatedAt: existing?.socialRecordUpdatedAt ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    syncStatus: 'pending',
  };
  await db.transaction('rw', db.athletes, db.syncQueue, async () => {
    await db.athletes.put(record);
    await db.syncQueue.put({
      mutationId: crypto.randomUUID(),
      entityType: 'athlete',
      entityId: input.id,
      operation: existing ? 'update' : 'create',
      baseVersion: input.version,
      occurredAt: now,
      payload: input,
      status: 'pending',
      attempts: 0,
    });
  });
  if (navigator.onLine) {
    try {
      await synchronize();
      return (await db.athletes.get(input.id)) ?? record;
    } catch {
      // The local record is already safe and will be retried automatically.
    }
  }
  return record;
}

export async function deleteAthleteOnline(id: string): Promise<void> {
  if (!navigator.onLine) throw new Error('Conéctate para retirar un deportista de forma segura.');
  await api.deleteAthlete(id);
  await db.athletes.delete(id);
}

export async function loadSocialRecord(athleteId: string): Promise<SocialRecordData | null> {
  if (navigator.onLine) {
    try {
      const remote = await api.getSocialRecord(athleteId);
      if (remote) {
        await db.socialRecords.put({ ...remote, syncStatus: 'synced' });
        return remote;
      }
    } catch {
      // Fall back to IndexedDB.
    }
  }
  return (await db.socialRecords.where('athleteId').equals(athleteId).last()) ?? null;
}

export async function saveSocialRecordOffline(input: SocialRecordInput): Promise<SocialRecordData> {
  const existing = await db.socialRecords.get(input.id);
  const now = new Date().toISOString();
  const record: SocialRecordData = { ...input, createdAt: existing?.createdAt ?? now, updatedAt: now, syncStatus: 'pending' };
  await db.transaction('rw', db.socialRecords, db.athletes, db.syncQueue, async () => {
    await db.socialRecords.put(record);
    await db.athletes.update(input.athleteId, { hasSocialRecord: true, socialRecordUpdatedAt: now });
    await db.syncQueue.put({
      mutationId: crypto.randomUUID(),
      entityType: 'social-record',
      entityId: input.id,
      operation: existing ? 'update' : 'create',
      baseVersion: input.version,
      occurredAt: now,
      payload: input,
      status: 'pending',
      attempts: 0,
    });
  });
  if (navigator.onLine) void synchronize();
  return record;
}
