import { beforeEach, describe, expect, it } from 'vitest';
import { getDatabase, STORES } from '../../../shared/storage/database.js';
import { addUserToCircle, removeUserFromCircle } from './circleService.js';

async function clearLocalStores() {
  const database = await getDatabase();
  const transaction = database.transaction(
    [STORES.users, STORES.circle, STORES.syncQueue, STORES.syncMeta],
    'readwrite'
  );
  for (const name of [STORES.users, STORES.circle, STORES.syncQueue, STORES.syncMeta]) {
    await transaction.objectStore(name).clear();
  }
  await transaction.done;
}

describe('offline Circle actions', () => {
  beforeEach(async () => {
    await clearLocalStores();
  });

  it('persists an offline add locally and records its outbox operation atomically', async () => {
    const database = await getDatabase();

    const membership = await addUserToCircle(44, { offline: true });

    expect(membership).toMatchObject({ userId: 44, pendingSync: true });
    expect(membership.id).toMatch(/^local:/);
    expect(await database.get(STORES.circle, membership.id)).toEqual(membership);
    expect(await database.getAll(STORES.syncQueue)).toMatchObject([
      { type: 'circle.add', payload: { userId: 44, membershipId: membership.id } }
    ]);
  });

  it('cancels an offline add when that membership is removed before sync', async () => {
    const database = await getDatabase();
    const membership = await addUserToCircle(45, { offline: true });

    await removeUserFromCircle(membership, { offline: true });

    expect(await database.get(STORES.circle, membership.id)).toBeUndefined();
    expect(await database.getAll(STORES.syncQueue)).toEqual([]);
  });
});
