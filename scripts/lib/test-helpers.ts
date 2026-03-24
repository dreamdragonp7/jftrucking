/**
 * JFT E2E Sandbox Test Helpers
 *
 * Shared utilities for all test scripts. Provides:
 * - Environment variable loading from .env.local
 * - Supabase admin client creation (service_role)
 * - Sandbox safety guard
 * - Test result tracking and reporting
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

  const envPath = path.resolve(__dirname, "../../.env.local");
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
    console.log("  E2E SANDBOX TEST REPORT");
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
}
