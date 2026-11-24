import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addUserToCircle as createMembership,
  loadCircleMemberships,
  removeUserFromCircle as deleteMembership
} from '../features/circle/data/circleService.js';
import {
  getPendingCircleOperations,
  registerBackgroundCircleSync
} from '../features/sync/data/outboxRepository.js';
import { syncPendingCircleOperations } from '../features/sync/data/syncService.js';
import { loadUsers } from '../features/users/data/userService.js';
import { getDatabase } from '../shared/storage/database.js';
import { AppDataContext } from './AppDataContext.js';

export function AppDataProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [status, setStatus] = useState({ database: 'loading', api: 'loading' });
  const [pendingOperationCount, setPendingOperationCount] = useState(0);
  const [isOfflineSimulated, setOfflineSimulated] = useState(false);
  const [isBrowserOnline, setBrowserOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine
  );
  const [backgroundSyncVersion, setBackgroundSyncVersion] = useState(0);
  const pendingAdds = useRef(new Set());
  const pendingRemovals = useRef(new Set());
  const loadVersion = useRef(0);
  const isOffline = isOfflineSimulated || !isBrowserOnline;

  const refreshPendingOperationCount = useCallback(async () => {
    try {
      const operations = await getPendingCircleOperations();
      setPendingOperationCount(operations.length);
    } catch (error) {
      console.error('Could not read the local synchronization queue.', error);
    }
  }, []);

  const addToCircle = useCallback(async (userId) => {
    if (memberships.some((membership) => membership.userId === userId)) return null;
    if (pendingAdds.current.has(userId)) return null;

    pendingAdds.current.add(userId);
    try {
      const membership = await createMembership(userId, { offline: isOffline });
      setMemberships((current) => current.some((item) => item.userId === userId)
        ? current
        : [...current, membership]);
      await refreshPendingOperationCount();
      if (membership.pendingSync) {
        setStatus((current) => ({ ...current, api: 'cached' }));
        if (!isOfflineSimulated && typeof navigator !== 'undefined' && !navigator.onLine) {
          await registerBackgroundCircleSync();
        }
      }
      return membership;
    } finally {
      pendingAdds.current.delete(userId);
    }
  }, [isOffline, isOfflineSimulated, memberships, refreshPendingOperationCount]);

  const removeFromCircle = useCallback(async (membership) => {
    if (pendingRemovals.current.has(membership.id)) return;

    pendingRemovals.current.add(membership.id);
    try {
      const result = await deleteMembership(membership, { offline: isOffline });
      setMemberships((current) => current.filter((item) => item.id !== membership.id));
      await refreshPendingOperationCount();
      if (result?.pendingSync) {
        setStatus((current) => ({ ...current, api: 'cached' }));
        if (!isOfflineSimulated && typeof navigator !== 'undefined' && !navigator.onLine) {
          await registerBackgroundCircleSync();
        }
      }
    } finally {
      pendingRemovals.current.delete(membership.id);
    }
  }, [isOffline, isOfflineSimulated, refreshPendingOperationCount]);

  useEffect(() => {
    function updateBrowserStatus() {
      setBrowserOnline(navigator.onLine);
    }

    window.addEventListener('online', updateBrowserStatus);
    window.addEventListener('offline', updateBrowserStatus);
    return () => {
      window.removeEventListener('online', updateBrowserStatus);
      window.removeEventListener('offline', updateBrowserStatus);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;
    function handleServiceWorkerMessage(event) {
      if (event.data?.type === 'CIRCLE_SYNC_COMPLETE') {
        setBackgroundSyncVersion((version) => version + 1);
      }
    }
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const currentLoadVersion = ++loadVersion.current;

    async function loadAppData() {
      try {
        await getDatabase();
        if (isMounted && currentLoadVersion === loadVersion.current) {
          setStatus((current) => ({ ...current, database: 'ready' }));
        }
      } catch (error) {
        console.error('Could not initialize the local database.', error);
        if (isMounted && currentLoadVersion === loadVersion.current) {
          setStatus({ database: 'error', api: 'unavailable' });
        }
        return;
      }

      if (!isOffline) {
        try {
          await syncPendingCircleOperations();
        } catch (error) {
          console.warn('Queued Circle changes could not be synchronized yet.', error);
        }
      }

      const [usersResult, membershipsResult, operationsResult] = await Promise.allSettled([
        loadUsers({ offline: isOffline }),
        loadCircleMemberships({ offline: isOffline }),
        getPendingCircleOperations()
      ]);

      if (!isMounted || currentLoadVersion !== loadVersion.current) return;

      if (usersResult.status === 'fulfilled') setUsers(usersResult.value.users);
      if (membershipsResult.status === 'fulfilled') {
        setMemberships(membershipsResult.value.memberships);
      }
      if (operationsResult.status === 'fulfilled') {
        setPendingOperationCount(operationsResult.value.length);
      }

      const successfulLoads = [usersResult, membershipsResult]
        .filter((result) => result.status === 'fulfilled');
      const source = successfulLoads.some((result) => result.value.source === 'cache')
        ? 'cached'
        : 'connected';
      const apiStatus = successfulLoads.length === 2
        ? source
        : successfulLoads.length === 1 ? 'partial' : 'unavailable';

      setStatus((current) => ({ ...current, api: apiStatus }));
    }

    loadAppData();
    return () => {
      isMounted = false;
    };
  }, [backgroundSyncVersion, isOffline]);

  return (
    <AppDataContext.Provider value={{
      users,
      memberships,
      status,
      pendingOperationCount,
      isOffline,
      isOfflineSimulated,
      setOfflineSimulated,
      addToCircle,
      removeFromCircle
    }}>
      {children}
    </AppDataContext.Provider>
  );
}
