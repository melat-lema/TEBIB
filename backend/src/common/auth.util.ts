import { supabase } from '../config/supabase.config';

export async function getUserIdFromAuthHeader(authHeader?: string): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}