# Circle Management

Circle Management is a React single-page application for browsing a people directory and maintaining a personal Circle. It is built with Vite and can be installed as a Progressive Web App (PWA). User and Circle data are cached locally so the app can continue to work when the API is unavailable.

## Features

- Browse the user directory and view individual profiles.
- Add people to or remove people from your Circle.
- Cache directory and Circle data in IndexedDB for offline access.
- Queue offline Circle changes locally and synchronize them with the API later.
- Use the **Simulate offline** control to exercise offline behavior without changing the device's network connection.
- Install the app on supported browsers and load its cached app shell offline.

## Requirements

- Node.js and npm.

## Run locally

Install dependencies:

```sh
npm install
```

Start the mock API in one terminal:

```sh
npm run api
```

The API uses `mock-api/db.json` and listens on `http://127.0.0.1:3001`.

Start the Vite development server in a second terminal:

```sh
npm run dev
```

Open the local URL printed by Vite (by default, `http://localhost:5173`). Vite proxies `/api` requests to the mock API on port 3001.

## Build and preview

Create a production build and serve it locally:

```sh
npm run build
npm run preview
```

Open the preview URL printed by Vite (by default, `http://localhost:4173`). Keep `npm run api` running as well: the preview server also proxies `/api` to the local mock API. The production service worker and install behavior should be checked using the preview build; the regular development server does not register the production service worker by default.

For a deployed build, configure `VITE_API_BASE_URL` to point to the deployed API. The default `/api` URL relies on the local Vite proxy and is not itself a production API.

## Offline and synchronization behavior

The browser stores cached users and Circle memberships in IndexedDB (`circle-management`). When an API request fails temporarily, the app can display the cached data. Offline additions and removals are written to a durable synchronization queue and reflected locally right away.

When the app is open and online, it attempts to send queued changes to the API on load and when browser connectivity returns. Where supported, it also registers a Background Sync task named `circle-sync`; the browser may run that task in the service worker while the app is closed. Background Sync timing and availability depend on the browser. If it does not run, queued changes remain stored until the app next opens online.

The service worker precaches the built app assets and uses the cached `index.html` as the navigation fallback, allowing application routes to load offline. API responses are handled by the app's data and IndexedDB layers rather than cached by the service worker.

See [docs/pwa.md](docs/pwa.md) for PWA inspection and offline-check instructions and [src/shared/storage/README.md](src/shared/storage/README.md) for the local database details.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run api` | Start the JSON Server mock API |
| `npm run build` | Generate PWA icons and create a production build |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the Vitest test suite |
| `npm run icons:pwa` | Generate the PWA SVG and PNG icons |

## Project layout

- `src/features/users/`: directory and user profile API/data/UI.
- `src/features/circle/`: Circle membership API, local data, and UI.
- `src/features/sync/`: durable outbox and synchronization logic.
- `src/shared/storage/`: IndexedDB setup and storage documentation.
- `src/sw.js`: Workbox service worker and Background Sync handler.
- `mock-api/`: JSON Server configuration data and API notes.
- `docs/pwa.md`: PWA build and browser inspection notes.
