import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDatabase, STORES } from '../../../shared/storage/database.js';
import { ApiError } from '../../../shared/api/apiClient.js';
import { enqueueCircleOperation } from './outboxRepository.js';
import { syncPendingCircleOperations } from './syncService.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

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

describe('syncPendingCircleOperations', () => {
  beforeEach(async () => {
    await clearLocalStores();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts a queued add, replaces its temporary record, and removes the queue item', async () => {
    const database = await getDatabase();
    const addedAt = '2026-01-02T03:04:05.000Z';
    await database.put(STORES.circle, {
      id: 'local:add-1', userId: 12, addedAt, pendingSync: true
    });
    await enqueueCircleOperation('circle.add', {
      userId: 12, membershipId: 'local:add-1', addedAt
    });

    const fetchMock = vi.fn(async (url, options = {}) => {
      if (String(url).includes('?userId=')) return jsonResponse([]);
      if (options.method === 'POST') {
        return jsonResponse({ id: 81, userId: 12, addedAt }, 201);
      }
      throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncPendingCircleOperations();

    expect(result).toMatchObject({ syncedCount: 1, pendingCount: 0, error: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await database.get(STORES.circle, 'local:add-1')).toBeUndefined();
    expect(await database.get(STORES.circle, 81)).toMatchObject({
      userId: 12, pendingSync: false
    });
    expect(await database.getAll(STORES.syncQueue)).toEqual([]);
  });

  it('reuses an existing server membership instead of posting a duplicate', async () => {
    const database = await getDatabase();
    const existing = { id: 82, userId: 15, addedAt: '2026-01-01T00:00:00.000Z' };
    await database.put(STORES.circle, {
      id: 'local:add-2', userId: 15, addedAt: existing.addedAt, pendingSync: true
    });
    await enqueueCircleOperation('circle.add', {
      userId: 15, membershipId: 'local:add-2', addedAt: existing.addedAt
    });
    const fetchMock = vi.fn(async () => jsonResponse([existing]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncPendingCircleOperations();

    expect(result.syncedCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await database.get(STORES.circle, 82)).toMatchObject({ pendingSync: false });
  });

  it('keeps a failed operation queued, records the error, and preserves FIFO order', async () => {
    const database = await getDatabase();
    await enqueueCircleOperation('circle.add', {
      userId: 20, membershipId: 'local:add-3', addedAt: '2026-01-01T00:00:00.000Z'
    });
    await enqueueCircleOperation('circle.remove', { userId: 21, membershipId: 99 });
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (String(url).includes('?userId=')) return jsonResponse([]);
      if (options.method === 'POST') return jsonResponse({ message: 'try again' }, 503);
      throw new Error('The later remove should not run before the failed add.');
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncPendingCircleOperations();
    const pending = await database.getAll(STORES.syncQueue);

    expect(result.syncedCount).toBe(0);
    expect(result.pendingCount).toBe(2);
    expect(result.error).toBeInstanceOf(ApiError);
    expect(pending[0]).toMatchObject({ attemptCount: 1, lastError: 'try again' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats a missing server record as an already-completed remove', async () => {
    const database = await getDatabase();
    await database.put(STORES.circle, { id: 404, userId: 30 });
    await enqueueCircleOperation('circle.remove', { userId: 30, membershipId: 404 });
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'not found' }, 404)));

    const result = await syncPendingCircleOperations();

    expect(result).toMatchObject({ syncedCount: 1, pendingCount: 0, error: null });
    expect(await database.get(STORES.circle, 404)).toBeUndefined();
  });
});
