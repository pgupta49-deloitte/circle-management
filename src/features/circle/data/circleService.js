import { isTemporaryApiFailure } from '../../../shared/api/apiClient.js';
import { getDatabase, STORES } from '../../../shared/storage/database.js';
import {
  createPendingCircleOperation,
  getPendingCircleOperations
} from '../../sync/data/outboxRepository.js';
import {
  addCircleMembership as createCircleMembership,
  deleteCircleMembership as deleteCircleMembershipRequest,
  listCircleMemberships
} from '../api/circleApi.js';
import {
  getCircleMemberships,
  removeCircleMembership,
  replaceCachedCircleMemberships,
  saveCircleMembership
} from './circleRepository.js';

function mergeServerAndPendingMemberships(serverMemberships, cachedMemberships, operations) {
  const pendingRemovals = new Set(
    operations
      .filter((operation) => operation.type === 'circle.remove')
      .map((operation) => String(operation.payload.membershipId))
  );
  const visibleByUserId = new Map();

  for (const membership of serverMemberships) {
    if (!pendingRemovals.has(String(membership.id))) {
      visibleByUserId.set(membership.userId, membership);
    }
  }

  for (const operation of operations.filter((item) => item.type === 'circle.add')) {
    const localMembership = cachedMemberships.find(
      (membership) => membership.id === operation.payload.membershipId
    ) ?? {
      id: operation.payload.membershipId,
      userId: operation.payload.userId,
      addedAt: operation.payload.addedAt,
      pendingSync: true
    };

    if (!visibleByUserId.has(localMembership.userId)) {
      visibleByUserId.set(localMembership.userId, localMembership);
    }
  }

  return [...visibleByUserId.values()];
}

/** Load Circle data from the API and retain local operations awaiting sync. */
export async function loadCircleMemberships({ offline = false } = {}) {
  const cachedMemberships = await getCircleMemberships();
  const operations = await getPendingCircleOperations();

  if (offline) return { memberships: cachedMemberships, source: 'cache' };

  try {
    const serverMemberships = await listCircleMemberships();
    if (!Array.isArray(serverMemberships)) {
      throw new TypeError('The Circle endpoint must return an array.');
    }

    const memberships = mergeServerAndPendingMemberships(
      serverMemberships,
      cachedMemberships,
      operations
    );
    await replaceCachedCircleMemberships(memberships);
    return { memberships, source: 'api' };
  } catch (error) {
    if (!isTemporaryApiFailure(error)) throw error;
    return { memberships: cachedMemberships, source: 'cache' };
  }
}

async function saveOfflineAddition(userId) {
  const randomId = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const id = `local:${randomId}`;
  const addedAt = new Date().toISOString();
  const membership = { id, userId, addedAt, pendingSync: true };
  const operation = createPendingCircleOperation('circle.add', {
    userId,
    membershipId: id,
    addedAt
  });
  const database = await getDatabase();
  const transaction = database.transaction([STORES.circle, STORES.syncQueue], 'readwrite');

  await transaction.objectStore(STORES.circle).put(membership);
  await transaction.objectStore(STORES.syncQueue).add(operation);
  await transaction.done;
  return membership;
}

async function saveOfflineRemoval(membership) {
  const operations = await getPendingCircleOperations();
  const localAddition = operations.find((operation) =>
    operation.type === 'circle.add' && operation.payload.membershipId === membership.id
  );
  const database = await getDatabase();
  const transaction = database.transaction([STORES.circle, STORES.syncQueue], 'readwrite');

  await transaction.objectStore(STORES.circle).delete(membership.id);

  if (localAddition) {
    // Adding and then removing before sync cancels both local operations.
    await transaction.objectStore(STORES.syncQueue).delete(localAddition.id);
  } else if (!String(membership.id).startsWith('local:')) {
    const operation = createPendingCircleOperation('circle.remove', {
      userId: membership.userId,
      membershipId: membership.id
    });
    await transaction.objectStore(STORES.syncQueue).add(operation);
  }

  await transaction.done;
  return !localAddition && !String(membership.id).startsWith('local:');
}

export async function addUserToCircle(userId, { offline = false } = {}) {
  if (!offline) {
    try {
      const membership = await createCircleMembership(userId);
      await saveCircleMembership(membership);
      return membership;
    } catch (error) {
      if (!isTemporaryApiFailure(error)) throw error;
    }
  }

  return saveOfflineAddition(userId);
}

export async function removeUserFromCircle(membership, { offline = false } = {}) {
  const isLocalPendingAddition = membership.pendingSync || String(membership.id).startsWith('local:');
  if (offline || isLocalPendingAddition) {
    const pendingSync = await saveOfflineRemoval(membership);
    return { pendingSync };
  }

  try {
    await deleteCircleMembershipRequest(membership.id);
    await removeCircleMembership(membership.id);
    return { pendingSync: false };
  } catch (error) {
    if (!isTemporaryApiFailure(error)) throw error;
    const pendingSync = await saveOfflineRemoval(membership);
    return { pendingSync };
  }
}
