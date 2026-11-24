import { ApiError } from '../../../shared/api/apiClient.js';
import { getDatabase, STORES } from '../../../shared/storage/database.js';
import {
  addCircleMembership,
  deleteCircleMembership,
  listCircleMembershipsForUser
} from '../../circle/api/circleApi.js';

const LOCK_KEY = 'circle-sync';
const LOCK_DURATION_MS = 60_000;
let activeSync;

async function acquireLock(database, owner) {
  const transaction = database.transaction(STORES.syncMeta, 'readwrite');
  const store = transaction.objectStore(STORES.syncMeta);
  const current = await store.get(LOCK_KEY);
  if (current && current.expiresAt > Date.now() && current.owner !== owner) {
    await transaction.done;
    return false;
  }
  await store.put({ key: LOCK_KEY, owner, expiresAt: Date.now() + LOCK_DURATION_MS });
  await transaction.done;
  return true;
}

async function renewLock(database, owner) {
  const transaction = database.transaction(STORES.syncMeta, 'readwrite');
  const store = transaction.objectStore(STORES.syncMeta);
  const current = await store.get(LOCK_KEY);
  if (current?.owner !== owner) {
    await transaction.done;
    return false;
  }
  await store.put({ key: LOCK_KEY, owner, expiresAt: Date.now() + LOCK_DURATION_MS });
  await transaction.done;
  return true;
}

async function releaseLock(database, owner) {
  const transaction = database.transaction(STORES.syncMeta, 'readwrite');
  const store = transaction.objectStore(STORES.syncMeta);
  const current = await store.get(LOCK_KEY);
  if (current?.owner === owner) await store.delete(LOCK_KEY);
  await transaction.done;
}

async function readPendingOperations(database) {
  const operations = await database.getAllFromIndex(STORES.syncQueue, 'status', 'pending');
  return operations.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
}

async function applyAddition(database, operation) {
  const { userId, membershipId, addedAt } = operation.payload;
  const existing = await listCircleMembershipsForUser(userId);
  const membership = existing[0] ?? await addCircleMembership(userId, addedAt);
  const transaction = database.transaction([STORES.circle, STORES.syncQueue], 'readwrite');
  const queue = transaction.objectStore(STORES.syncQueue);
  const stillQueued = await queue.get(operation.id);
  const circle = transaction.objectStore(STORES.circle);

  await circle.delete(membershipId);
  if (stillQueued) {
    await circle.put({ ...membership, pendingSync: false });
    await queue.delete(operation.id);
  } else {
    // If the user removed a local pending addition while its POST was in flight,
    // preserve that intent by queuing a delete for the newly created server row.
    await queue.add({
      type: 'circle.remove',
      payload: { userId, membershipId: membership.id },
      status: 'pending',
      attemptCount: 0,
      createdAt: new Date().toISOString()
    });
  }
  await transaction.done;
}

async function applyRemoval(database, operation) {
  try {
    await deleteCircleMembership(operation.payload.membershipId);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
  }

  const transaction = database.transaction([STORES.circle, STORES.syncQueue], 'readwrite');
  await transaction.objectStore(STORES.circle).delete(operation.payload.membershipId);
  await transaction.objectStore(STORES.syncQueue).delete(operation.id);
  await transaction.done;
}

async function recordFailure(database, operation, error) {
  const transaction = database.transaction(STORES.syncQueue, 'readwrite');
  const queue = transaction.objectStore(STORES.syncQueue);
  const latest = await queue.get(operation.id);
  if (latest) {
    await queue.put({
      ...latest,
      attemptCount: (latest.attemptCount ?? 0) + 1,
      lastAttemptAt: new Date().toISOString(),
      lastError: error?.message ?? 'Synchronization failed.'
    });
  }
  await transaction.done;
}

async function runSync() {
  const database = await getDatabase();
  const owner = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  if (!await acquireLock(database, owner)) {
    return { syncedCount: 0, pendingCount: (await readPendingOperations(database)).length, error: null };
  }

  let syncedCount = 0;
  let error = null;
  try {
    for (const operation of await readPendingOperations(database)) {
      if (!await renewLock(database, owner)) break;
      try {
        if (operation.type === 'circle.add') await applyAddition(database, operation);
        else if (operation.type === 'circle.remove') await applyRemoval(database, operation);
        else throw new Error(`Unsupported queued operation: ${operation.type}`);
        syncedCount += 1;
      } catch (syncError) {
        await recordFailure(database, operation, syncError);
        error = syncError;
        break; // Keep FIFO ordering when an earlier action cannot be applied.
      }
    }
  } finally {
    await releaseLock(database, owner);
  }

  return { syncedCount, pendingCount: (await readPendingOperations(database)).length, error };
}

/** Replay the durable outbox. A lock keeps the page and service worker from overlapping. */
export function syncPendingCircleOperations() {
  if (activeSync) return activeSync;
  activeSync = runSync().finally(() => { activeSync = undefined; });
  return activeSync;
}
