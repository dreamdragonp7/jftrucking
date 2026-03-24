import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppSetting } from "@/types/database";

/**
 * Get a single setting value by key.
 * Uses the server client (RLS allows admin reads).
 */
export async function getSetting(key: string): Promise<string | null> {
  // Try admin client first (works in cron/background contexts too)
  const admin = createAdminClient();
  if (admin) {
    const { data } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .single();
    return data?.value ?? null;
  }

  // Fallback to server client
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .single();

  return data?.value ?? null;
}

/**
 * Set a single setting value.
 * Requires admin/service role client.
 */
export async function setSetting(key: string, value: string): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) throw new Error("Admin client not configured");

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) throw new Error(`Failed to set setting "${key}": ${error.message}`);
}

/**
 * Get multiple settings by keys.
 * Returns a Record with keys mapped to their values.
 */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const admin = createAdminClient();
  const client = admin ?? (await createClient());
  if (!client) return {};

  const { data } = await client
    .from("app_settings")
    .select("key, value")
    .in("key", keys);

  const result: Record<string, string> = {};
  for (const row of data ?? []) {
    result[row.key] = row.value;
  }
  return result;
}

/**
 * Get all settings.
 */
export async function getAllSettings(): Promise<AppSetting[]> {
  const admin = createAdminClient();
  const client = admin ?? (await createClient());
  if (!client) return [];

  const { data } = await client
    .from("app_settings")
    .select("*")
    .order("key");

  return (data ?? []) as AppSetting[];
}
