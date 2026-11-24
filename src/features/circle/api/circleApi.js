import { requestJson } from '../../../shared/api/apiClient.js';

export function listCircleMemberships() {
  return requestJson('/circle');
}

export function listCircleMembershipsForUser(userId) {
  return requestJson(`/circle?userId=${encodeURIComponent(userId)}`);
}

export function addCircleMembership(userId, addedAt = new Date().toISOString()) {
  return requestJson('/circle', {
    method: 'POST',
    body: JSON.stringify({ userId, addedAt })
  });
}

export function deleteCircleMembership(membershipId) {
  return requestJson(`/circle/${encodeURIComponent(membershipId)}`, {
    method: 'DELETE'
  });
}
