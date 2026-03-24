import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase admin client with the service role key.
 * ONLY use this server-side for operations that bypass RLS:
 * - Creating users programmatically
 * - Admin operations that span multiple tenants
 * - Background jobs / cron tasks
 *
 * Never expose this client to the browser.
 * Returns null if Supabase env vars are not configured.
 *
 * NOTE: Database generic typing is omitted here because supabase-js v2.99
 * requires fully inline types. When you run `supabase gen types typescript`,
 * replace `src/types/database.ts` and re-add `<Database>` to the call below.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
