import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error('Supabase service client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function resetSupabaseClient(): void {
  client = null;
}
