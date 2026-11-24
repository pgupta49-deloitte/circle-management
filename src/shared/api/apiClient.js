const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, { status, url } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
  }
}

export function isTemporaryApiFailure(error) {
  return error instanceof ApiError && (error.status === undefined || error.status >= 500);
}

/** Send a JSON request to the configured API and return its parsed response. */
export async function requestJson(path, options = {}) {
  const url = `${API_BASE_URL}/${path.replace(/^\//, '')}`;
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (error) {
    throw new ApiError(error.message || 'The API could not be reached.', { url });
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body.message || body.error || '';
    } catch {
      // Keep the HTTP status as the useful error when the response is not JSON.
    }

    throw new ApiError(detail || `API request failed with status ${response.status}.`, {
      status: response.status,
      url
    });
  }

  if (response.status === 204) return undefined;
  return response.json();
}
