import { afterEach, describe, expect, it } from 'vitest';
import { SocialAppDatabase } from './db';

describe('offline mutation queue', () => {
  const databases: SocialAppDatabase[] = [];
  afterEach(async () => Promise.all(databases.map((database) => database.delete())));

  it('persists a mutation as pending until server confirmation', async () => {
    const database = new SocialAppDatabase(`test-${crypto.randomUUID()}`);
    databases.push(database);
    await database.syncQueue.add({
      mutationId: crypto.randomUUID(), entityType: 'draft', entityId: crypto.randomUUID(), operation: 'create', baseVersion: 0,
      occurredAt: new Date().toISOString(), payload: { safe: true }, status: 'pending', attempts: 0,
    });
    const mutation = await database.syncQueue.toCollection().first();
    expect(mutation?.status).toBe('pending');
    expect(await database.syncQueue.count()).toBe(1);
  });
});
