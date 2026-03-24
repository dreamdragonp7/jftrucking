/**
 * QuickBooks OAuth token storage and retrieval.
 *
 * Stores tokens in a Supabase `app_settings` key-value table.
 * Uses the admin (service role) client to bypass RLS since tokens
 * should never be accessible from the browser.
 *
 * Keys stored:
 *   qb_access_token, qb_refresh_token, qb_realm_id,
 *   qb_access_token_expires_at, qb_refresh_token_expires_at,
 *   qb_company_name, qb_connected_at
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredQBTokens {
  accessToken: string;
  refreshToken: string;
  realmId: string;
  accessTokenExpiresAt: string; // ISO date
  refreshTokenExpiresAt: string; // ISO date
  companyName: string | null;
  connectedAt: string; // ISO date
}

// ---------------------------------------------------------------------------
// Helpers — app_settings KV store
// ---------------------------------------------------------------------------

async function getSettingValue(key: string): Promise<string | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return null;
  return data.value;
}

async function setSettingValue(key: string, value: string): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) throw new Error("Supabase admin client is not configured");

  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) throw new Error(`Failed to store setting ${key}: ${error.message}`);
}

async function deleteSettingValue(key: string): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) return;

  await supabase.from("app_settings").delete().eq("key", key);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Save OAuth tokens after initial authorization or token refresh.
 */
export async function saveTokens(params: {
  accessToken: string;
  refreshToken: string;
  realmId: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  companyName?: string;
}): Promise<void> {
  await Promise.all([
    setSettingValue("qb_access_token", params.accessToken),
    setSettingValue("qb_refresh_token", params.refreshToken),
    setSettingValue("qb_realm_id", params.realmId),
    setSettingValue(
      "qb_access_token_expires_at",
      params.accessTokenExpiresAt.toISOString()
    ),
    setSettingValue(
      "qb_refresh_token_expires_at",
      params.refreshTokenExpiresAt.toISOString()
    ),
    params.companyName
      ? setSettingValue("qb_company_name", params.companyName)
      : Promise.resolve(),
    setSettingValue("qb_connected_at", new Date().toISOString()),
  ]);
}

/**
 * Get current stored tokens. Returns null if not connected.
 */
export async function getTokens(): Promise<StoredQBTokens | null> {
  const [
    accessToken,
    refreshToken,
    realmId,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    companyName,
    connectedAt,
  ] = await Promise.all([
    getSettingValue("qb_access_token"),
    getSettingValue("qb_refresh_token"),
    getSettingValue("qb_realm_id"),
    getSettingValue("qb_access_token_expires_at"),
    getSettingValue("qb_refresh_token_expires_at"),
    getSettingValue("qb_company_name"),
    getSettingValue("qb_connected_at"),
  ]);

  if (!accessToken || !refreshToken || !realmId) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    realmId,
    accessTokenExpiresAt: accessTokenExpiresAt ?? new Date().toISOString(),
    refreshTokenExpiresAt:
      refreshTokenExpiresAt ??
      new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
    companyName,
    connectedAt: connectedAt ?? new Date().toISOString(),
  };
}

/**
 * Delete all stored tokens (disconnect from QuickBooks).
 */
export async function deleteTokens(): Promise<void> {
  await Promise.all([
    deleteSettingValue("qb_access_token"),
    deleteSettingValue("qb_refresh_token"),
    deleteSettingValue("qb_realm_id"),
    deleteSettingValue("qb_access_token_expires_at"),
    deleteSettingValue("qb_refresh_token_expires_at"),
    deleteSettingValue("qb_company_name"),
    deleteSettingValue("qb_connected_at"),
  ]);
}

/**
 * Check if QuickBooks is connected (tokens exist).
 */
export async function isConnected(): Promise<boolean> {
  const tokens = await getTokens();
  return tokens !== null;
}

/**
 * Check if the access token is expired or about to expire (within 5 minutes).
 */
export function isAccessTokenExpired(expiresAt: string): boolean {
  const expiryTime = new Date(expiresAt).getTime();
  const bufferMs = 5 * 60 * 1000; // 5 minute buffer
  return Date.now() >= expiryTime - bufferMs;
}

/**
 * Check if the refresh token is expired.
 */
export function isRefreshTokenExpired(expiresAt: string): boolean {
  return Date.now() >= new Date(expiresAt).getTime();
}

/**
 * Get last sync timestamp for a given entity type.
 */
export async function getLastSyncTime(entityType: string): Promise<string | null> {
  return getSettingValue(`qb_last_sync_${entityType}`);
}

/**
 * Set last sync timestamp for a given entity type.
 */
export async function setLastSyncTime(entityType: string): Promise<void> {
  await setSettingValue(`qb_last_sync_${entityType}`, new Date().toISOString());
}

// ---------------------------------------------------------------------------
// OAuth CSRF State Management
// ---------------------------------------------------------------------------

/**
 * Save the OAuth state token for CSRF validation during callback.
 * Stores the state and a timestamp so stale states can be rejected.
 */
export async function saveOAuthState(state: string): Promise<void> {
  const payload = JSON.stringify({
    state,
    createdAt: new Date().toISOString(),
  });
  await setSettingValue("qb_oauth_state", payload);
}

/**
 * Get the stored OAuth state token. Returns null if not set or expired (>10 minutes).
 */
export async function getOAuthState(): Promise<string | null> {
  const raw = await getSettingValue("qb_oauth_state");
  if (!raw) return null;

  try {
    const { state, createdAt } = JSON.parse(raw) as {
      state: string;
      createdAt: string;
    };

    // Reject states older than 10 minutes
    const age = Date.now() - new Date(createdAt).getTime();
    if (age > 10 * 60 * 1000) {
      await clearOAuthState();
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

/**
 * Clear the stored OAuth state after validation or expiry.
 */
export async function clearOAuthState(): Promise<void> {
  await deleteSettingValue("qb_oauth_state");
}
