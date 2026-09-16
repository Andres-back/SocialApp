import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AuthUser } from '@socialapp/shared';
import { LEGACY_REPLICA_NAME, SocialAppDatabase } from '../../lib/db';
import { prepareReplicaForUser, ReplicaSwitchRequiredError } from './replica-session';

const first: AuthUser = { id: 'replica-test-first', email: 'first@example.com', displayName: 'Primera cuenta', roles: [], permissions: [] };
const second: AuthUser = { ...first, id: 'replica-test-second', email: 'second@example.com' };
const names = [LEGACY_REPLICA_NAME, `${LEGACY_REPLICA_NAME}-user-${second.id}`];
let legacy: SocialAppDatabase;

async function clean() {
  for (const name of names) await new SocialAppDatabase(name).delete();
}

describe('safe account replica switch', () => {
  beforeEach(async () => {
    await clean();
    legacy = new SocialAppDatabase(LEGACY_REPLICA_NAME);
    await prepareReplicaForUser(first, false, legacy);
  });
  afterEach(async () => { legacy.close(); await clean(); });

  it('allows the original account to return without confirmation', async () => {
    await expect(prepareReplicaForUser(first, false, legacy)).resolves.toBe(LEGACY_REPLICA_NAME);
  });

  it('requires confirmation even when everything is synchronized', async () => {
    await expect(prepareReplicaForUser(second, false, legacy)).rejects.toMatchObject({ pending: 0, previousEmail: first.email });
    expect((await legacy.metadata.get('replica.owner'))?.value).toBe(first.id);
  });

  it.each(['pending', 'processing', 'error', 'conflict'] as const)('blocks a switch with a %s mutation without deleting it', async (status) => {
    await legacy.syncQueue.put({ mutationId: 'saved-interview', entityType: 'campaign', entityId: 'brigada', operation: 'update', baseVersion: 1, occurredAt: new Date().toISOString(), payload: { answers: ['guardadas'] }, status, attempts: 1 });
    await expect(prepareReplicaForUser(second, true, legacy)).rejects.toBeInstanceOf(ReplicaSwitchRequiredError);
    expect(await legacy.syncQueue.count()).toBe(1);
    expect((await legacy.metadata.get('replica.owner'))?.value).toBe(first.id);
  });

  it('isolates the new account and restores the old replica with its drafts intact', async () => {
    const draft = { id: 'interview-draft', formType: 'tamizaje', data: { answer: 'original' }, updatedAt: new Date().toISOString(), createdBy: first.id };
    await legacy.drafts.put(draft);
    const name = await prepareReplicaForUser(second, true, legacy);
    const target = new SocialAppDatabase(name);
    try {
      expect(name).not.toBe(legacy.name);
      expect(await target.drafts.count()).toBe(0);
      expect((await target.metadata.get('replica.owner'))?.value).toBe(second.id);
      expect(await legacy.drafts.get(draft.id)).toEqual(draft);
      await expect(prepareReplicaForUser(first, true, target)).resolves.toBe(LEGACY_REPLICA_NAME);
      expect(await legacy.drafts.get(draft.id)).toEqual(draft);
    } finally { target.close(); }
  });
});
