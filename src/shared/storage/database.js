import { openDB } from 'idb';

export const DATABASE_NAME = 'circle-management';
export const DATABASE_VERSION = 2;

export const STORES = Object.freeze({
  users: 'users',
  circle: 'circle',
  syncQueue: 'syncQueue',
  syncMeta: 'syncMeta'
});

let databasePromise;

/**
 * Opens the application's IndexedDB database and applies any pending schema
 * upgrades. Keeping one connection avoids opening a new database per request.
 */
export function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORES.users)) {
          const users = database.createObjectStore(STORES.users, { keyPath: 'id' });
          users.createIndex('name', 'name');
        }

        if (!database.objectStoreNames.contains(STORES.circle)) {
          const circle = database.createObjectStore(STORES.circle, { keyPath: 'id' });
          // A person can only appear once in the local Circle.
          circle.createIndex('userId', 'userId', { unique: true });
        }

        if (!database.objectStoreNames.contains(STORES.syncQueue)) {
          const syncQueue = database.createObjectStore(STORES.syncQueue, {
            keyPath: 'id',
            autoIncrement: true
          });
          syncQueue.createIndex('status', 'status');
          syncQueue.createIndex('createdAt', 'createdAt');
        }

        if (!database.objectStoreNames.contains(STORES.syncMeta)) {
          database.createObjectStore(STORES.syncMeta, { keyPath: 'key' });
        }
      },
      blocking() {
        // Let a newer tab or app version upgrade the schema without being held
        // open by this connection.
        databasePromise?.then((database) => database.close());
        databasePromise = undefined;
      },
      terminated() {
        databasePromise = undefined;
      }
    }).catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }

  return databasePromise;
}
