import { getDatabase, STORES } from '../../../shared/storage/database.js';

/** Replace the cached directory with the latest complete user list. */
export async function replaceCachedUsers(users) {
  const database = await getDatabase();
  const transaction = database.transaction(STORES.users, 'readwrite');

  await transaction.store.clear();
  await Promise.all(users.map((user) => transaction.store.put(user)));
  await transaction.done;
}

export async function getCachedUsers() {
  const database = await getDatabase();
  return database.getAll(STORES.users);
}

export async function getCachedUser(userId) {
  const database = await getDatabase();
  return database.get(STORES.users, userId);
}
