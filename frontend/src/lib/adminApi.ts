import { API_URL } from './config';

export const ADMIN_TOKEN_KEY = 'adminToken';

export function adminLogout() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem('adminUser');
}

/** Reads the exp claim of the JWT so the UI can send you to login before a request fails. */
export function tokenIsValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now() + 5000;
  } catch {
    return false;
  }
}

export class AdminApiError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function adminFetch<T = any>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const res = await fetch(`${API_URL}/admin${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token ?? ''}`,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 || res.status === 403) {
    adminLogout();
    window.location.href = '/admin/login';
    throw new AdminApiError('Session expired', res.status);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new AdminApiError(msg || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}
