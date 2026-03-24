import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for server-side usage (Server Components, Route Handlers, Server Actions).
 * Reads/writes cookies for auth session management.
 * Must be called within a request context.
 *
 * Returns null if Supabase env vars are not configured.
 *
 * NOTE: Database generic typing is omitted here because supabase-js v2.99
 * requires fully inline types for proper Insert/Update resolution. The data
 * access layer handles typed responses via explicit casts. When you run
 * `supabase gen types typescript`, replace `src/types/database.ts` and
 * re-add `<Database>` to the createServerClient call below.
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll is called from Server Components where cookies
          // cannot be set. This is expected and can be ignored when
          // the proxy refreshes the session.
        }
      },
    },
  });
}
