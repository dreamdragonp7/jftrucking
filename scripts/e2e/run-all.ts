#!/usr/bin/env npx tsx
/**
 * JFT E2E Test Orchestrator
 *
 * Runs all 11 test suites in order, passes shared context between them,
 * and prints a combined report at the end.
 *
 * Prerequisites:
 *   1. Run seed: npx tsx scripts/e2e/lib/seed-test-data.ts
 *   2. Run tests: npx tsx scripts/e2e/run-all.ts
 *   3. Cleanup: npx tsx scripts/e2e/cleanup.ts
 *
 * Usage:  npx tsx scripts/e2e/run-all.ts
 */

// MUST be first -- patches @/lib/supabase/server to work outside Next.js
import "./lib/patch-server-client";

import {
  createAdminClient,
  assertSandboxMode,
  loadEnv,
  TestReporter,
} from "./lib/test-helpers";
import { TEST_ACCOUNTS } from "./lib/test-accounts";
import type { TestContext } from "./lib/types";

// Import test suites
import { runAuthLifecycleTests } from "./tests/01-auth-lifecycle";
import { runRoleAccessTests } from "./tests/02-role-access";
import { runRLSIsolationTests } from "./tests/03-rls-isolation";
import { runWorkflowTests } from "./tests/04-workflow";
import { runDisputeTests } from "./tests/05-disputes";
import { runFinancialTests } from "./tests/06-financials";
import { runQBSyncTests } from "./tests/07-qb-sync";
import { runNotificationTests } from "./tests/08-notifications";
import { runDashboardTests } from "./tests/09-dashboard";
import { runEdgeCaseTests } from "./tests/10-edge-cases";
import { runCronJobTests } from "./tests/11-cron-jobs";

async function main() {
  loadEnv();
  const supabase = createAdminClient();
  await assertSandboxMode(supabase);

  console.log("=".repeat(60));
  console.log("  JFT E2E TEST SUITE");
  console.log("  " + new Date().toISOString());
  console.log("=".repeat(60));
  console.log("");

  // =========================================================================
  // Resolve seeded entity IDs into the shared context
  // =========================================================================
  console.log("Resolving seeded test entities...\n");

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("name", "TEST_DR_Horton")
    .single();

  const { data: customer2 } = await supabase
    .from("customers")
    .select("id")
    .eq("name", "TEST_Kaufman_Co")
    .single();

  const { data: carrier } = await supabase
    .from("carriers")
    .select("id")
    .eq("name", "TEST_CD_Hopkins")
    .single();

  const { data: driver } = await supabase
    .from("drivers")
    .select("id")
    .eq("name", "TEST_Chip_West")
    .single();

  const { data: truck } = await supabase
    .from("trucks")
    .select("id")
    .eq("number", "TEST_Truck_01")
    .single();

  const { data: quarry } = await supabase
    .from("sites")
    .select("id")
    .eq("name", "TEST_Kaufman_Sand")
    .single();

  const { data: jobsite } = await supabase
    .from("sites")
    .select("id")
    .eq("name", "TEST_Frisco_Lakes")
    .single();

  const { data: ftWorthSite } = await supabase
    .from("sites")
    .select("id")
    .eq("name", "TEST_Ft_Worth_Site")
    .single();

  const { data: cushionSand } = await supabase
    .from("materials")
    .select("id")
    .eq("name", "Cushion Sand")
    .single();

  const { data: masonSand } = await supabase
    .from("materials")
    .select("id")
    .eq("name", "Mason Sand")
    .single();

  const { data: topSoil } = await supabase
    .from("materials")
    .select("id")
    .eq("name", "Top Soil")
    .single();

  // Resolve user IDs
  const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const userIds: Record<string, string> = {};
  const pendingUserIds: Record<string, string> = {};

  for (const [key, account] of Object.entries(TEST_ACCOUNTS)) {
    const user = allUsers?.users?.find((u) => u.email === account.email);
    if (user) userIds[key] = user.id;
  }

  // Also resolve customer2 account
  const customer2User = allUsers?.users?.find(
    (u) => u.email === "test.customer2@jft-test.local"
  );
  if (customer2User) userIds.customer2 = customer2User.id;

  const pendingEmails = [
    "test.pending.customer@jft-test.local",
    "test.pending.driver@jft-test.local",
    "test.pending.carrier@jft-test.local",
  ];
  for (const email of pendingEmails) {
    const user = allUsers?.users?.find((u) => u.email === email);
    if (user) pendingUserIds[email.split("@")[0].replace("test.", "")] = user.id;
  }

  // Validate
  const missing: string[] = [];
  if (!customer) missing.push("TEST_DR_Horton");
  if (!carrier) missing.push("TEST_CD_Hopkins");
  if (!driver) missing.push("TEST_Chip_West");
  if (!truck) missing.push("TEST_Truck_01");
  if (!quarry) missing.push("TEST_Kaufman_Sand");
  if (!jobsite) missing.push("TEST_Frisco_Lakes");
  if (!cushionSand) missing.push("Cushion Sand");

  if (missing.length > 0) {
    console.error(
      `Missing test entities: ${missing.join(", ")}.\n` +
        `Run 'npx tsx scripts/e2e/lib/seed-test-data.ts' first.`
    );
    process.exit(1);
  }

  const materialIds: Record<string, string> = {};
  if (cushionSand) materialIds["Cushion Sand"] = cushionSand.id;
  if (masonSand) materialIds["Mason Sand"] = masonSand.id;
  if (topSoil) materialIds["Top Soil"] = topSoil.id;

  const ctx: TestContext = {
    customerId: customer!.id,
    customer2Id: customer2?.id ?? "",
    carrierId: carrier!.id,
    driverId: driver!.id,
    truckId: truck!.id,
    kaufmanSandId: quarry!.id,
    friscoLakesId: jobsite!.id,
    ftWorthSiteId: ftWorthSite?.id ?? "",
    materialIds,
    userIds,
    pendingUserIds,
    customer2AccountId: customer2User?.id ?? "",
  };

  console.log("  All test entities resolved.\n");

  // =========================================================================
  // Clean up prior test workflow data
  // =========================================================================
  console.log("Cleaning up prior test workflow data...\n");

  // Delete in FK order
  const { data: priorSettlements } = await supabase
    .from("carrier_settlements")
    .select("id")
    .eq("carrier_id", ctx.carrierId);
  if (priorSettlements && priorSettlements.length > 0) {
    const sIds = priorSettlements.map((s) => s.id);
    await supabase.from("carrier_settlement_lines").delete().in("settlement_id", sIds);
    await supabase.from("carrier_settlements").delete().in("id", sIds);
  }

  // Clean invoices for BOTH test customers
  const testCustomerIds = [ctx.customerId, ctx.customer2Id].filter(Boolean);
  for (const custId of testCustomerIds) {
    const { data: priorInvoices } = await supabase
      .from("invoices")
      .select("id")
      .eq("customer_id", custId);
    if (priorInvoices && priorInvoices.length > 0) {
      const iIds = priorInvoices.map((i) => i.id);
      await supabase.from("payments").delete().in("invoice_id", iIds);
      await supabase.from("invoice_line_items").delete().in("invoice_id", iIds);
      await supabase.from("invoices").delete().in("id", iIds);
    }
  }

  // Clean TEST-prefixed invoices (edge case + cron test artifacts)
  const { data: prefixInvoices } = await supabase
    .from("invoices")
    .select("id")
    .like("invoice_number", "TEST-%");
  if (prefixInvoices && prefixInvoices.length > 0) {
    const piIds = prefixInvoices.map((i) => i.id);
    await supabase.from("payments").delete().in("invoice_id", piIds);
    await supabase.from("invoice_line_items").delete().in("invoice_id", piIds);
    await supabase.from("invoices").delete().in("id", piIds);
  }

  const { data: priorPOs } = await supabase
    .from("purchase_orders")
    .select("id")
    .like("po_number", "TEST-%");
  if (priorPOs && priorPOs.length > 0) {
    const pIds = priorPOs.map((p) => p.id);
    const { data: priorDispatches } = await supabase
      .from("dispatches")
      .select("id")
      .in("purchase_order_id", pIds);
    if (priorDispatches && priorDispatches.length > 0) {
      const dIds = priorDispatches.map((d) => d.id);
      await supabase.from("deliveries").delete().in("dispatch_id", dIds);
      await supabase.from("dispatches").delete().in("id", dIds);
    }
    await supabase.from("purchase_orders").delete().in("id", pIds);
  }

  // Clean notifications for test users
  const testUserIds = Object.values(userIds);
  if (testUserIds.length > 0) {
    await supabase.from("notifications").delete().in("user_id", testUserIds);
  }

  // Clean isolation test invoices
  await supabase.from("invoices").delete().eq("invoice_number", "TEST-ISOLATION-001");

  console.log("  Prior test data cleaned.\n");

  // =========================================================================
  // Run all test suites in order
  // =========================================================================
  const masterReporter = new TestReporter("COMBINED E2E RESULTS");
  const startTime = Date.now();

  const suites = [
    { name: "01-Auth Lifecycle", fn: runAuthLifecycleTests },
    { name: "02-Role Access", fn: runRoleAccessTests },
    { name: "03-RLS Isolation", fn: runRLSIsolationTests },
    { name: "04-Workflow", fn: runWorkflowTests },
    { name: "05-Disputes", fn: runDisputeTests },
    { name: "06-Financials", fn: runFinancialTests },
    { name: "07-QB Sync", fn: runQBSyncTests },
    { name: "08-Notifications", fn: runNotificationTests },
    { name: "09-Dashboard", fn: runDashboardTests },
    { name: "10-Edge Cases", fn: runEdgeCaseTests },
    { name: "11-Cron Jobs", fn: runCronJobTests },
  ];

  const suiteResults: Array<{
    name: string;
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  }> = [];

  for (const suite of suites) {
    console.log("\n" + "=".repeat(60));
    try {
      const suiteReporter = await suite.fn(ctx);
      masterReporter.merge(suiteReporter);
      suiteResults.push({
        name: suite.name,
        passed: suiteReporter.passCount,
        failed: suiteReporter.failCount,
        skipped: suiteReporter.skipCount,
        total: suiteReporter.totalCount,
      });
    } catch (err: any) {
      console.error(`\n  SUITE CRASHED: ${suite.name}: ${err.message}\n`);
      masterReporter.fail(0, `${suite.name} CRASHED`, err.message);
      suiteResults.push({
        name: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        total: 1,
      });
    }
  }

  // =========================================================================
  // Combined Report
  // =========================================================================
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n\n" + "=".repeat(60));
  console.log("  COMBINED E2E TEST REPORT");
  console.log("=".repeat(60));
  console.log("");

  for (const result of suiteResults) {
    const status = result.failed === 0 ? "PASS" : "FAIL";
    const marker = result.failed === 0 ? "+" : "x";
    const pad = ".".repeat(Math.max(2, 35 - result.name.length));
    console.log(
      `  [${marker}] ${result.name} ${pad} ${status}  (${result.passed}/${result.total} passed, ${result.skipped} skipped)`
    );
  }

  console.log("");
  console.log("=".repeat(60));
  console.log(
    `  Total: ${masterReporter.totalCount}  |  ` +
      `Passed: ${masterReporter.passCount}  |  ` +
      `Failed: ${masterReporter.failCount}  |  ` +
      `Skipped: ${masterReporter.skipCount}`
  );
  console.log(`  Time: ${elapsed}s`);
  console.log("=".repeat(60));

  if (masterReporter.failCount > 0) {
    console.log(`\n  ${masterReporter.failCount} test(s) FAILED.`);
    process.exit(1);
  } else {
    console.log("\n  All tests PASSED.");
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
