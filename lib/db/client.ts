import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates an authenticated browser Supabase client configured for Realtime.
 *
 * Constraints per Phase 7:
 * - Uses the authenticated client with the Clerk JWT access token so private
 *   Realtime channels can be authorized by Postgres RLS on realtime.messages.
 */
export function createBrowserDbClient(token?: string | null): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    accessToken: async () => token ?? null,
  });
}
