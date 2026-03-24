/**
 * QuickBooks OAuth token storage and retrieval.
 *
 * Stores tokens in a Supabase `app_settings` key-value table.
 * Uses the admin (service role) client to bypass RLS since tokens
 * should never be accessible from the browser.
 *
 * Keys are namespaced by environment:
 *   qb_sandbox_access_token, qb_production_access_token, etc.
 *
 * Legacy (non-prefixed) keys are auto-migrated to sandbox on first read.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { QbEnvironment } from "@/types/database";

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
// Environment-aware key helpers
// ---------------------------------------------------------------------------

/** The 7 token key suffixes. Prefix with `qb_{env}_` to get full key. */
const TOKEN_SUFFIXES = [
  "access_token",
  "refresh_token",
  "realm_id",
  "access_token_expires_at",
  "refresh_token_expires_at",
  "company_name",
  "connected_at",
] as const;

/** Build environment-namespaced key: e.g. "qb_sandbox_access_token" */
function envKey(env: QbEnvironment, suffix: string): string {
  return `qb_${env}_${suffix}`;
}

/**
 * Resolve current QB environment.
 * Lazy-imports environment.ts to avoid circular dependency
 * (environment.ts imports from admin.ts, not from tokens.ts).
 */
async function resolveEnvironment(): Promise<QbEnvironment> {
  const { getCurrentQBEnvironment } = await import("./environment");
  return getCurrentQBEnvironment();
}

/**
 * Auto-migrate legacy (non-prefixed) token keys to sandbox-prefixed keys.
 * Called once during getTokens() if legacy keys are detected.
 */
async function migrateLegacyTokens(): Promise<void> {
  const legacyAccess = await getSettingValue("qb_access_token");
  if (!legacyAccess) return; // No legacy tokens to migrate

  console.log("[QB Tokens] Migrating legacy token keys to sandbox namespace...");

  for (const suffix of TOKEN_SUFFIXES) {
    const legacyKey = `qb_${suffix}`;
    const newKey = envKey("sandbox", suffix);
    const value = await getSettingValue(legacyKey);
    if (value) {
      await setSettingValue(newKey, value);
      await deleteSettingValue(legacyKey);
    }
  }

  console.log("[QB Tokens] Legacy token migration complete");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Save OAuth tokens after initial authorization or token refresh.
 * Tokens are stored under the CURRENT environment prefix.
 */
export async function saveTokens(params: {
  accessToken: string;
  refreshToken: string;
  realmId: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  companyName?: string;
  environment?: QbEnvironment;
}): Promise<void> {
  const env = params.environment ?? await resolveEnvironment();

  await Promise.all([
    setSettingValue(envKey(env, "access_token"), params.accessToken),
    setSettingValue(envKey(env, "refresh_token"), params.refreshToken),
    setSettingValue(envKey(env, "realm_id"), params.realmId),
    setSettingValue(
      envKey(env, "access_token_expires_at"),
      params.accessTokenExpiresAt.toISOString()
    ),
    setSettingValue(
      envKey(env, "refresh_token_expires_at"),
      params.refreshTokenExpiresAt.toISOString()
    ),
    params.companyName
      ? setSettingValue(envKey(env, "company_name"), params.companyName)
      : Promise.resolve(),
    setSettingValue(envKey(env, "connected_at"), new Date().toISOString()),
  ]);
}

/**
 * Get current stored tokens for the CURRENT environment.
 * Auto-migrates legacy non-prefixed keys to sandbox on first access.
 * Returns null if not connected.
 */
export async function getTokens(): Promise<StoredQBTokens | null> {
  const env = await resolveEnvironment();

  // Try environment-prefixed keys first
  let accessToken = await getSettingValue(envKey(env, "access_token"));

  // If no env-prefixed token, check for legacy keys and migrate
  if (!accessToken) {
    await migrateLegacyTokens();
    accessToken = await getSettingValue(envKey(env, "access_token"));
  }

  if (!accessToken) return null;

  const [
    refreshToken,
    realmId,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    companyName,
    connectedAt,
  ] = await Promise.all([
    getSettingValue(envKey(env, "refresh_token")),
    getSettingValue(envKey(env, "realm_id")),
    getSettingValue(envKey(env, "access_token_expires_at")),
    getSettingValue(envKey(env, "refresh_token_expires_at")),
    getSettingValue(envKey(env, "company_name")),
    getSettingValue(envKey(env, "connected_at")),
  ]);

  if (!refreshToken || !realmId) {
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
 * Delete tokens for a SPECIFIC environment.
 * If no environment is specified, deletes tokens for the CURRENT environment.
 */
export async function deleteTokens(targetEnv?: QbEnvironment): Promise<void> {
  const env = targetEnv ?? await resolveEnvironment();

  await Promise.all(
    TOKEN_SUFFIXES.map((suffix) => deleteSettingValue(envKey(env, suffix)))
  );
}

/**
 * Check if QuickBooks is connected (tokens exist for current environment).
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
