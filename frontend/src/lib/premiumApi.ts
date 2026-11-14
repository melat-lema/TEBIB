import { supabase } from './supabase';
import { API_URL } from './config';

export async function premiumFetch<T = any>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${API_URL}/premium${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return data as T;
}
