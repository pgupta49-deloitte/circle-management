import { getDatabase, STORES } from '../../../shared/storage/database.js';

/**
 * Save a Circle action for later delivery to the API.
 *
 * `type` describes the action (for example, `circle.add` or `circle.remove`);
 * `payload` contains the data needed to apply it on the server.
 */
export function createPendingCircleOperation(type, payload) {
  return {
    type,
    payload,
    status: 'pending',
    attemptCount: 0,
    createdAt: new Date().toISOString()
  };
}

export async function enqueueCircleOperation(type, payload) {
  const database = await getDatabase();
  const operation = createPendingCircleOperation(type, payload);

  const id = await database.add(STORES.syncQueue, operation);
  return { ...operation, id };
}

export async function getPendingCircleOperations() {
  const database = await getDatabase();
  const operations = await database.getAllFromIndex(
    STORES.syncQueue,
    'status',
    'pending'
  );

  return operations.sort((first, second) => first.createdAt.localeCompare(second.createdAt));
}

export async function removeQueuedOperation(operationId) {
  const database = await getDatabase();
  return database.delete(STORES.syncQueue, operationId);
}

export async function registerBackgroundCircleSync() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.sync) return false;
    await registration.sync.register('circle-sync');
    return true;
  } catch (error) {
    console.warn('Background Sync could not be registered.', error);
    return false;
  }
}
