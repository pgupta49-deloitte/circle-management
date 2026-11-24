# Local data storage

IndexedDB is the browser-side database. The shared database module owns the
database name, version, and schema; feature repositories provide operations
without exposing IndexedDB transactions to React components.

## Stores

| Store | Key | Purpose |
| --- | --- | --- |
| `users` | `id` | Cached user directory records |
| `circle` | `id` | Cached Circle memberships; the unique `userId` index prevents duplicate local membership |
| `syncQueue` | auto-incrementing `id` | Pending Circle actions with type, payload, status, attempt count, and creation time |

The schema is versioned in `database.js`. When a future change needs a different
shape, increment `DATABASE_VERSION` and add a migration in the `upgrade` callback
instead of deleting the database.

## Offline behavior

When the API is unreachable, the directory and Circle views read their cached
records. Circle additions are saved with a local `local:` membership ID and a
`circle.add` outbox entry in one IndexedDB transaction. Removing an API-backed
member hides it locally and queues a `circle.remove` entry. If a locally queued
addition is removed before synchronization, both local records are deleted so
there is no unnecessary server operation.

The app's **Simulate offline** control exercises the local paths without changing
browser connectivity. The app also listens to the browser's `online` and
`offline` events. Pending outbox entries remain durable; the synchronization
phase will send them to JSON Server after connectivity returns.

To inspect records in a browser, open DevTools > **Application** (Chrome/Edge) >
**IndexedDB** > `circle-management`. Directory and Circle records populate after
API data loads; the sync queue receives entries when you make offline changes.
