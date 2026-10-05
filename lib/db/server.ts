import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { env } from "@/lib/env";

/**
 * Creates a Supabase client for server-side execution that attaches the
 * Clerk identity token and active organization context to every database request.
 *
 * Design constraints:
 * 1. Single session system: Clerk owns session cookies and lifecycle entirely.
 *    Supabase session persistence and refresh are disabled to prevent cookie collisions.
 * 2. Token-backed client: The token and organization claim travel with every request
 *    so Postgres RLS policies can extract the organization ID and isolate rows.
 */
export async function createServerDbClient(): Promise<SupabaseClient> {
  const { getToken, orgId } = await auth();
  const token = await getToken();

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(orgId ? { "x-org-id": orgId } : {}),
      },
    },
    accessToken: async () => {
      const currentToken = await getToken();
      return currentToken ?? null;
    },
  });
}
