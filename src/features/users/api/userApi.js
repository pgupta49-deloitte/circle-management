import { requestJson } from '../../../shared/api/apiClient.js';

export function listUsers() {
  return requestJson('/users');
}

export function getUser(userId) {
  return requestJson(`/users/${encodeURIComponent(userId)}`);
}
