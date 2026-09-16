import type { AuthUser } from '@socialapp/shared';
import { db, LEGACY_REPLICA_NAME, SocialAppDatabase } from '../../lib/db';

export class ReplicaSwitchRequiredError extends Error {
  constructor(public readonly pending: number, public readonly drafts: number, public readonly previousEmail?: string) {
    super(pending > 0
      ? `Hay ${pending} cambio${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} de otra cuenta. Entra con esa cuenta y sincroniza antes de cambiar. Tus datos siguen guardados.`
      : 'Puedes cambiar de cuenta de forma segura. La copia anterior y sus borradores se conservarán por separado.');
    this.name = 'ReplicaSwitchRequiredError';
  }
}

export async function prepareReplicaForUser(user: AuthUser, confirmSwitch = false, current = db): Promise<string> {
  const owner = await current.metadata.get('replica.owner');
  const switching = owner && owner.value !== user.id;
  if (switching) {
    const [pending, drafts, profile] = await Promise.all([
      current.syncQueue.where('status').anyOf(['pending', 'processing', 'error', 'conflict']).count(),
      current.drafts.count(),
      current.metadata.get('replica.profile'),
    ]);
    const previousEmail = (profile?.value as { email?: string } | undefined)?.email;
    if (pending > 0 || !confirmSwitch) throw new ReplicaSwitchRequiredError(pending, drafts, previousEmail);
  }
  let target = current;
  if (switching) {
    const legacy = current.name === LEGACY_REPLICA_NAME ? current : new SocialAppDatabase(LEGACY_REPLICA_NAME);
    try {
      const legacyOwner = await legacy.metadata.get('replica.owner');
      target = legacyOwner?.value === user.id
        ? new SocialAppDatabase(LEGACY_REPLICA_NAME)
        : new SocialAppDatabase(`${LEGACY_REPLICA_NAME}-user-${user.id}`);
    } finally {
      if (legacy !== current) legacy.close();
    }
  }
  try {
    await target.transaction('rw', target.metadata, async () => {
      const targetOwner = await target.metadata.get('replica.owner');
      if (targetOwner && targetOwner.value !== user.id) throw new Error('La copia de destino pertenece a otra cuenta. No se modificó ningún registro.');
      const updatedAt = new Date().toISOString();
      await target.metadata.bulkPut([
        { key: 'replica.owner', value: user.id, updatedAt },
        { key: 'replica.profile', value: { id: user.id, email: user.email, displayName: user.displayName }, updatedAt },
      ]);
    });
    return target.name;
  } finally {
    if (target !== current) target.close();
  }
}
