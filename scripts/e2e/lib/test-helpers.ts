/**
 * JFT E2E Sandbox Test Helpers
 *
 * Shared utilities for all test scripts. Provides:
 * - Environment variable loading from .env.local
 * - Supabase admin client creation (service_role)
 * - Supabase anon client creation (for role-specific testing)
 * - Sandbox safety guard
 * - Test result tracking and reporting
 * - QB token refresh utilities
 *
 * Re-exports everything from the original lib so existing imports still work.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Environment Loading
// ---------------------------------------------------------------------------

let envLoaded = false;

export function loadEnv(): void {
  if (envLoaded) return;

  const envPath = path.resolve(__dirname, "../../../.env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing .env.local at ${envPath}`);
  }

  const contents = fs.readFileSync(envPath, "utf-8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    // Don't override existing env vars
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  envLoaded = true;
}

// ---------------------------------------------------------------------------
// Supabase Clients
// ---------------------------------------------------------------------------

export function createAdminClient(): SupabaseClient {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createAnonClient(): SupabaseClient {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ---------------------------------------------------------------------------
// Safety Guard
// ---------------------------------------------------------------------------

export async function assertSandboxMode(
  supabase: SupabaseClient
): Promise<void> {
  // Check 1: Read qb_environment_state table
  const { data, error } = await supabase
    .from("qb_environment_state")
    .select("current_environment")
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(
      `SAFETY: Could not read qb_environment_state: ${error.message}. Refusing to proceed.`
    );
  }

  if (data?.current_environment !== "sandbox") {
    throw new Error(
      "SAFETY: System is in PRODUCTION mode. E2E tests REFUSED. Switch to sandbox first."
    );
  }

  // Check 2: Verify env var matches
  const envVar = process.env.QB_ENVIRONMENT ?? "sandbox";
  if (envVar === "production") {
    throw new Error(
      "SAFETY: QB_ENVIRONMENT is 'production'. E2E tests REFUSED."
    );
  }

  console.log("[OK] Sandbox mode confirmed -- safe to proceed\n");
}

// ---------------------------------------------------------------------------
// QB Token Refresh Utilities
// ---------------------------------------------------------------------------

const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

/**
 * Read QB tokens from app_settings. Tries namespaced keys first, then legacy.
 */
export async function getQBTokens(supabase: SupabaseClient): Promise<{
  accessToken: string;
  refreshToken: string;
  realmId: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
} | null> {
  const prefixes = ["qb_sandbox_", "qb_"];
  for (const prefix of prefixes) {
    const keys = ["access_token", "refresh_token", "realm_id", "access_token_expires_at", "refresh_token_expires_at"];
    const results: Record<string, string | null> = {};

    for (const key of keys) {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", `${prefix}${key}`)
        .maybeSingle();
      results[key] = data?.value ?? null;
    }

    if (results.access_token && results.refresh_token && results.realm_id) {
      return {
        accessToken: results.access_token,
        refreshToken: results.refresh_token,
        realmId: results.realm_id,
        accessTokenExpiresAt: results.access_token_expires_at ?? new Date().toISOString(),
        refreshTokenExpiresAt: results.refresh_token_expires_at ?? new Date(Date.now() + 100 * 86400000).toISOString(),
      };
    }
  }
  return null;
}

/**
 * Refresh the QB access token using the stored refresh token.
 * Calls the Intuit OAuth token endpoint directly.
 * Saves new tokens back to app_settings.
 */
export async function refreshQBToken(supabase: SupabaseClient): Promise<{
  accessToken: string;
  refreshToken: string;
  realmId: string;
} | null> {
  loadEnv();

  const clientId = process.env.QB_CLIENT_ID;
  const clientSecret = process.env.QB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.log("  QB_CLIENT_ID or QB_CLIENT_SECRET not set -- cannot refresh");
    return null;
  }

  const tokens = await getQBTokens(supabase);
  if (!tokens) {
    console.log("  No QB tokens found -- cannot refresh");
    return null;
  }

  console.log("  Refreshing QB access token...");

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
  });

  const res = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  QB token refresh FAILED (${res.status}): ${text}`);
    return null;
  }

  const data = await res.json();
  const newAccessToken = data.access_token;
  const newRefreshToken = data.refresh_token;

  if (!newAccessToken || !newRefreshToken) {
    console.error("  QB token refresh returned no tokens");
    return null;
  }

  // Save new tokens to app_settings
  const prefix = "qb_sandbox_";
  const accessExpiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
  const refreshExpiresAt = new Date(Date.now() + (data.x_refresh_token_expires_in ?? 8726400) * 1000).toISOString();

  const upserts = [
    { key: `${prefix}access_token`, value: newAccessToken },
    { key: `${prefix}refresh_token`, value: newRefreshToken },
    { key: `${prefix}access_token_expires_at`, value: accessExpiresAt },
    { key: `${prefix}refresh_token_expires_at`, value: refreshExpiresAt },
  ];

  for (const { key, value } of upserts) {
    await supabase
      .from("app_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  }

  console.log("  QB access token refreshed successfully");

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    realmId: tokens.realmId,
  };
}

/**
 * Get QB tokens with auto-refresh if the access token is expired.
 */
export async function getQBTokensWithRefresh(supabase: SupabaseClient): Promise<{
  accessToken: string;
  realmId: string;
} | null> {
  const tokens = await getQBTokens(supabase);
  if (!tokens) return null;

  // Check if access token is expired (with 5-minute buffer)
  const expiresAt = new Date(tokens.accessTokenExpiresAt).getTime();
  const bufferMs = 5 * 60 * 1000;
  const isExpired = Date.now() >= expiresAt - bufferMs;

  if (isExpired) {
    console.log("  QB ACCESS TOKEN EXPIRED -- attempting refresh...");
    const refreshed = await refreshQBToken(supabase);
    if (!refreshed) {
      console.error("  QB token refresh failed. Manual reconnection may be needed.");
      return null;
    }
    return { accessToken: refreshed.accessToken, realmId: refreshed.realmId };
  }

  return { accessToken: tokens.accessToken, realmId: tokens.realmId };
}

// ---------------------------------------------------------------------------
// Test Reporter
// ---------------------------------------------------------------------------

interface TestResult {
  step: number;
  name: string;
  passed: boolean;
  skipped: boolean;
  details: string[];
}

export class TestReporter {
  private results: TestResult[] = [];
  public suiteName: string = "Test Suite";

  constructor(suiteName?: string) {
    if (suiteName) this.suiteName = suiteName;
  }

  pass(step: number, name: string, ...details: string[]): void {
    this.results.push({ step, name, passed: true, skipped: false, details });
    const tag = `Step ${String(step).padStart(2)}`;
    const dots = ".".repeat(Math.max(2, 40 - name.length));
    console.log(`  ${tag}: ${name} ${dots} [PASS]`);
    for (const d of details) {
      console.log(`    -> ${d}`);
    }
  }

  fail(step: number, name: string, ...details: string[]): void {
    this.results.push({ step, name, passed: false, skipped: false, details });
    const tag = `Step ${String(step).padStart(2)}`;
    const dots = ".".repeat(Math.max(2, 40 - name.length));
    console.log(`  ${tag}: ${name} ${dots} [FAIL]`);
    for (const d of details) {
      console.log(`    -> ${d}`);
    }
  }

  skip(step: number, name: string, ...details: string[]): void {
    this.results.push({ step, name, passed: true, skipped: true, details });
    const tag = `Step ${String(step).padStart(2)}`;
    const dots = ".".repeat(Math.max(2, 40 - name.length));
    console.log(`  ${tag}: ${name} ${dots} [SKIP]`);
    for (const d of details) {
      console.log(`    -> ${d}`);
    }
  }

  assert(
    condition: boolean,
    step: number,
    name: string,
    ...details: string[]
  ): void {
    if (condition) {
      this.pass(step, name, ...details);
    } else {
      this.fail(step, name, ...details);
    }
  }

  printReport(): void {
    console.log("\n" + "=".repeat(60));
    console.log(`  ${this.suiteName} REPORT`);
    console.log("=".repeat(60));

    const passed = this.results.filter((r) => r.passed && !r.skipped).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const skipped = this.results.filter((r) => r.skipped).length;
    const total = this.results.length;

    for (const r of this.results) {
      const tag = `Step ${String(r.step).padStart(2)}`;
      const dots = ".".repeat(Math.max(2, 40 - r.name.length));
      const status = r.skipped ? "SKIP" : r.passed ? "PASS" : "FAIL";
      const marker = r.skipped ? "~" : r.passed ? "+" : "x";
      console.log(`  [${marker}] ${tag}: ${r.name} ${dots} ${status}`);
      if (!r.passed) {
        for (const d of r.details) {
          console.log(`       -> ${d}`);
        }
      }
    }

    console.log("=".repeat(60));
    console.log(
      `  Total: ${total}  |  Passed: ${passed}  |  Failed: ${failed}  |  Skipped: ${skipped}`
    );
    console.log("=".repeat(60));
  }

  get allPassed(): boolean {
    return this.results.every((r) => r.passed);
  }

  get failCount(): number {
    return this.results.filter((r) => !r.passed).length;
  }

  get passCount(): number {
    return this.results.filter((r) => r.passed && !r.skipped).length;
  }

  get skipCount(): number {
    return this.results.filter((r) => r.skipped).length;
  }

  get totalCount(): number {
    return this.results.length;
  }

  /** Merge another reporter's results into this one */
  merge(other: TestReporter): void {
    this.results.push(...other.results);
  }
}
