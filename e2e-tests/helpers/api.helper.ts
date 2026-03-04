/**
 * api.helper.ts
 *
 * Direct API calls for test seeding and cleanup. Uses fetch against the
 * app's REST API (not Playwright's page object).
 */

const API_URL = process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000';

interface RequestOptions {
  method?: string;
  body?: Record<string, unknown>;
  token?: string;
}

async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} → ${res.status}: ${text}`);
  }

  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('application/json') ? (res.json() as Promise<T>) : (res.text() as unknown as T);
}

/** Get basic dashboard info to verify a user is onboarded. */
export async function getDashboard(token: string) {
  return apiRequest('/api/dashboard', { token });
}

/** Accept or reject a session request (for admin/testing helpers). */
export async function updateSessionStatus(
  sessionId: string,
  status: 'accepted' | 'rejected',
  token: string
) {
  return apiRequest(`/api/sessions/${sessionId}/status`, {
    method: 'PATCH',
    body: { status },
    token,
  });
}

export { apiRequest };
