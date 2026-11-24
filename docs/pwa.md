# PWA setup

`vite-plugin-pwa` creates the web app manifest and Workbox service worker during
the production build. The worker precaches the app shell and static assets, then
uses `index.html` as the navigation fallback so React Router routes can open
offline. User and Circle API data stays in IndexedDB; the service worker does
not cache API responses.

## Build and preview

```sh
npm run build
npm run preview
```

Use the preview server for PWA checks. The regular Vite development server does
not register the production service worker by default. Open the preview URL,
wait for the first page load so the worker can install and precache its assets,
then check browser DevTools:

- **Application > Manifest** shows the app identity, display mode, and icons.
- **Application > Service Workers** shows the active worker and its scope.
- **Application > Cache Storage** shows the Workbox precache.

The preview server proxies `/api` to the local JSON Server, so keep `npm run api`
running in another terminal. After that first page load, use DevTools Network >
**Offline** and reload a route such as `/users/1`. The app shell should load;
directory data is then read from IndexedDB. A deployed build must set
`VITE_API_BASE_URL` to its actual API URL because Vite's local proxy is only for
development and preview.

## Icons

`scripts/generate-pwa-icons.mjs` is the single source for the app mark. It writes
both the scalable SVG files and PNG fallbacks. The build runs this generator
before Vite so the manifest icons stay consistent.
