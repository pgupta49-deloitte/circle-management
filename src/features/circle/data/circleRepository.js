import { getDatabase, STORES } from '../../../shared/storage/database.js';

/** Replace the cached Circle with the latest complete API result. */
export async function replaceCachedCircleMemberships(memberships) {
  const database = await getDatabase();
  const transaction = database.transaction(STORES.circle, 'readwrite');

  await transaction.store.clear();
  for (const membership of memberships) {
    await transaction.store.put(membership);
  }
  await transaction.done;
}

export async function saveCircleMembership(membership) {
  const database = await getDatabase();
  return database.put(STORES.circle, membership);
}

export async function getCircleMemberships() {
  const database = await getDatabase();
  return database.getAll(STORES.circle);
}

export async function getCircleMembershipByUserId(userId) {
  const database = await getDatabase();
  return database.getFromIndex(STORES.circle, 'userId', userId);
}

export async function removeCircleMembership(membershipId) {
  const database = await getDatabase();
  return database.delete(STORES.circle, membershipId);
}
