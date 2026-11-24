import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { syncPendingCircleOperations } from './features/sync/data/syncService.js';

self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

self.addEventListener('sync', (event) => {
  if (event.tag !== 'circle-sync') return;

  event.waitUntil((async () => {
    const result = await syncPendingCircleOperations();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'CIRCLE_SYNC_COMPLETE', pendingCount: result.pendingCount });
    }
    if (result.error) throw result.error;
  })());
});
