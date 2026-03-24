"use client";

import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Creates a Supabase client for browser/client-side usage.
 * Uses the publishable key for public operations.
 * Auth state is managed automatically via cookies.
 *
 * Returns null if Supabase env vars are not configured.
 * Uses singleton pattern — only one instance is created.
 *
 * NOTE: Database generic typing is omitted here because supabase-js v2.99
 * requires fully inline types. The data access layer handles typed responses
 * via explicit casts. When you run `supabase gen types typescript`, replace
 * `src/types/database.ts` and re-add `<Database>` to client creation calls.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  if (!client) {
    client = createBrowserClient(supabaseUrl, supabaseKey);
  }

  return client;
}
