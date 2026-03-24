/**
 * QuickBooks Environment Isolation — central environment module.
 *
 * This module is the single source of truth for which QB environment
 * (sandbox vs production) the app is currently operating in.
 *
 * It reads from the `qb_environment_state` table in Supabase (single-row),
 * falling back to the QB_ENVIRONMENT env var if the table doesn't exist yet.
 *
 * All QB-related code should call getCurrentQBEnvironment() to determine
 * whether to talk to sandbox or production APIs and how to tag records.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { QbEnvironment } from "@/types/database";

// ---------------------------------------------------------------------------
// Read current environment
// ---------------------------------------------------------------------------

/**
 * Get the current QB operating environment from the database.
 * Falls back to QB_ENVIRONMENT env var if the DB table is not accessible.
 */
export async function getCurrentQBEnvironment(): Promise<QbEnvironment> {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return envVarFallback();
    }

    const { data, error } = await supabase
      .from("qb_environment_state")
      .select("current_environment")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      console.warn(
        "[QB Env] Could not read qb_environment_state, falling back to env var:",
        error?.message
      );
      return envVarFallback();
    }

    return data.current_environment as QbEnvironment;
  } catch (err) {
    console.warn(
      "[QB Env] Exception reading environment state:",
      err instanceof Error ? err.message : err
    );
    return envVarFallback();
  }
}

/**
 * Returns current env and logs a warning if the env var doesn't match DB state.
 * Use this as a guard before any QB operation.
 */
export async function assertEnvironmentMatch(): Promise<QbEnvironment> {
  const dbEnv = await getCurrentQBEnvironment();
  const envVar = envVarFallback();

  if (envVar !== dbEnv) {
    console.warn(
      `[QB Env] Environment mismatch: DB says '${dbEnv}', QB_ENVIRONMENT env var says '${envVar}'. Using DB value.`
    );
  }

  return dbEnv;
}

// ---------------------------------------------------------------------------
// Switch environment
// ---------------------------------------------------------------------------

/**
 * Switch the QB environment from current to target.
 *
 * Steps:
 * 1. Read current environment
 * 2. Validate the switch is safe
 * 3. Clear QB IDs for the OLD environment (via DB function)
 * 4. Delete OLD environment tokens from app_settings
 * 5. Update qb_environment_state
 * 6. Log the switch
 */
export async function switchEnvironment(
  targetEnv: QbEnvironment,
  adminUserId: string
): Promise<{ success: boolean; cleared: number; error?: string }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { success: false, cleared: 0, error: "Supabase admin client not configured" };
  }

  try {
    // 1. Read current environment
    const currentEnv = await getCurrentQBEnvironment();

    if (currentEnv === targetEnv) {
      return { success: false, cleared: 0, error: `Already in ${targetEnv} mode` };
    }

    // 2. Clear QB IDs for the OLD environment
    let totalCleared = 0;
    if (currentEnv === "sandbox") {
      const { data: clearResult, error: clearErr } = await supabase
        .rpc("clear_sandbox_qb_data");
      if (clearErr) {
        console.error("[QB Env] Failed to clear sandbox data:", clearErr.message);
        return { success: false, cleared: 0, error: `Failed to clear sandbox data: ${clearErr.message}` };
      }
      if (clearResult && typeof clearResult === "object") {
        totalCleared = Object.values(clearResult as Record<string, number>).reduce(
          (sum, n) => sum + (typeof n === "number" ? n : 0),
          0
        );
      }
    }
    // Note: clear_production_qb_data() would be called if switching from production to sandbox,
    // but that's a dangerous operation -- for now we only support sandbox -> production

    // 3. Delete OLD environment tokens from app_settings
    const oldPrefix = `qb_${currentEnv}_`;
    const tokenKeys = [
      `${oldPrefix}access_token`,
      `${oldPrefix}refresh_token`,
      `${oldPrefix}realm_id`,
      `${oldPrefix}access_token_expires_at`,
      `${oldPrefix}refresh_token_expires_at`,
      `${oldPrefix}company_name`,
      `${oldPrefix}connected_at`,
    ];
    // Also clear legacy (non-prefixed) keys
    const legacyKeys = [
      "qb_access_token",
      "qb_refresh_token",
      "qb_realm_id",
      "qb_access_token_expires_at",
      "qb_refresh_token_expires_at",
      "qb_company_name",
      "qb_connected_at",
    ];

    for (const key of [...tokenKeys, ...legacyKeys]) {
      await supabase.from("app_settings").delete().eq("key", key);
    }

    // 4. Update qb_environment_state
    const { error: updateErr } = await supabase
      .from("qb_environment_state")
      .update({
        current_environment: targetEnv,
        previous_environment: currentEnv,
        switched_at: new Date().toISOString(),
        switched_by: adminUserId,
        notes: `Switched from ${currentEnv} to ${targetEnv}`,
      })
      .eq("id", 1);

    if (updateErr) {
      console.error("[QB Env] Failed to update environment state:", updateErr.message);
      return { success: false, cleared: totalCleared, error: `Failed to update state: ${updateErr.message}` };
    }

    // 5. Log the switch
    await supabase.from("qb_environment_switch_log").insert({
      from_environment: currentEnv,
      to_environment: targetEnv,
      switched_by: adminUserId,
      sandbox_records_cleared: currentEnv === "sandbox",
      production_records_backed_up: false,
      notes: `Cleared ${totalCleared} QB record(s) from ${currentEnv} environment`,
    });

    console.log(
      `[QB Env] Environment switched: ${currentEnv} -> ${targetEnv} by ${adminUserId}. Cleared ${totalCleared} records.`
    );

    return { success: true, cleared: totalCleared };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[QB Env] Switch failed:", message);
    return { success: false, cleared: 0, error: message };
  }
}

// ---------------------------------------------------------------------------
// Environment summary
// ---------------------------------------------------------------------------

/**
 * Get a summary of QB data counts per environment.
 */
export async function getEnvironmentSummary(): Promise<{
  current: QbEnvironment;
  sandbox: { customers: number; carriers: number; invoices: number; payments: number; settlements: number };
  production: { customers: number; carriers: number; invoices: number; payments: number; settlements: number };
}> {
  const current = await getCurrentQBEnvironment();

  const empty = { customers: 0, carriers: 0, invoices: 0, payments: 0, settlements: 0 };
  const result = {
    current,
    sandbox: { ...empty },
    production: { ...empty },
  };

  try {
    const supabase = createAdminClient();
    if (!supabase) return result;

    // Use the qb_data_summary() function from the migration
    const { data: summary, error } = await supabase.rpc("qb_data_summary");

    if (error || !summary) {
      console.warn("[QB Env] Could not fetch qb_data_summary:", error?.message);
      return result;
    }

    // The function returns a jsonb like:
    // { customers: {sandbox: N, production: N}, carriers: {...}, ... }
    const s = summary as Record<string, Record<string, number>>;

    for (const env of ["sandbox", "production"] as const) {
      result[env] = {
        customers: s.customers?.[env] ?? 0,
        carriers: s.carriers?.[env] ?? 0,
        invoices: s.invoices?.[env] ?? 0,
        payments: s.payments?.[env] ?? 0,
        settlements: s.settlements?.[env] ?? 0,
      };
    }

    return result;
  } catch (err) {
    console.warn("[QB Env] Exception fetching summary:", err instanceof Error ? err.message : err);
    return result;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function envVarFallback(): QbEnvironment {
  const envVal = process.env.QB_ENVIRONMENT;
  if (envVal === "production") return "production";
  return "sandbox";
}
