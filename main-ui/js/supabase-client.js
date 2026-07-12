/**
 * Stride — Supabase client (storefront)
 * Credentials come from root .env via Vite.
 */
import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const isSupabaseConfigured = Boolean(url && key);

export const supabase = isSupabaseConfigured ? createClient(url, key) : null;

export const DEFAULT_TENANT_ID =
  (import.meta.env.VITE_DEFAULT_TENANT_ID ?? '').trim() ||
  '00000000-0000-0000-0000-000000000001';

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add credentials to the root .env file.');
  }
  return supabase;
}
