import { isTemporaryApiFailure } from '../../../shared/api/apiClient.js';
import { listUsers } from '../api/userApi.js';
import { getCachedUsers, replaceCachedUsers } from './userRepository.js';

/** Load users from the API, falling back to the last saved directory offline. */
export async function loadUsers({ offline = false } = {}) {
  if (offline) {
    const users = await getCachedUsers();
    if (users.length) return { users, source: 'cache' };
    throw new Error('No cached users are available offline.');
  }

  try {
    const users = await listUsers();
    if (!Array.isArray(users)) {
      throw new TypeError('The users endpoint must return an array.');
    }

    await replaceCachedUsers(users);
    return { users, source: 'api' };
  } catch (error) {
    if (!isTemporaryApiFailure(error)) throw error;

    const users = await getCachedUsers();
    if (users.length) return { users, source: 'cache' };
    throw error;
  }
}
