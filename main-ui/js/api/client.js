/**
 * Commerce API base URL (trusted Fastify server).
 * Never put SERVICE_ROLE or INTERNAL_API_SECRET here.
 */
export const COMMERCE_API_URL = (
  import.meta.env.VITE_COMMERCE_API_URL || 'http://localhost:5180'
).replace(/\/$/, '');

export const DEFAULT_TENANT_ID =
  import.meta.env.VITE_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';

export class CommerceApiError extends Error {
  constructor(
    message,
    { code = 'API_ERROR', status = 500, details = null } = {}
  ) {
    super(message);
    this.name = 'CommerceApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function commerceFetch(path, options = {}) {
  const url = `${COMMERCE_API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new CommerceApiError('Cannot reach the commerce server. Is it running on port 5180?', {
      code: 'NETWORK_ERROR',
      status: 0,
    });
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok || body?.ok === false) {
    const err = body?.error || {};
    throw new CommerceApiError(err.message || `Request failed (${res.status})`, {
      code: err.code || 'API_ERROR',
      status: res.status,
      details: err.details,
    });
  }

  return body;
}

export function sessionQuery(session) {
  const params = new URLSearchParams({
    tenant_id: DEFAULT_TENANT_ID,
    customer_id: session.id,
    email: session.email,
  });
  return params.toString();
}
