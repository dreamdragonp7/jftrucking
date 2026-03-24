/**
 * 02 - Role Access Tests
 *
 * Tests:
 *  1. Driver cannot see customer-only tables (invoices, payments)
 *  2. Customer cannot see carrier data (carriers table)
 *  3. Carrier cannot see admin audit_log
 *  4. Carrier cannot see customer invoices/payments/customers
 *  5. AccountStatusGate handles all non-active statuses
 *  6. Admin can see all tables
 */

import {
  createAdminClient,
  createAnonClient,
  assertSandboxMode,
  TestReporter,
} from "../lib/test-helpers";
import { TEST_ACCOUNTS } from "../lib/test-accounts";
import type { TestContext } from "../lib/types";

export async function runRoleAccessTests(ctx: TestContext): Promise<TestReporter> {
  const reporter = new TestReporter("02-Role Access");
  const supabase = createAdminClient();
  await assertSandboxMode(supabase);

  console.log("--- 02: Role Access ---\n");

  let step = 0;

  // --- Step 1: Driver cannot see invoices, payments ---
  step++;
  try {
    const driverClient = createAnonClient();
    const { error: loginErr } = await driverClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.driver.email,
      password: TEST_ACCOUNTS.driver.password,
    });

    if (loginErr) throw new Error(`Driver login failed: ${loginErr.message}`);

    const { data: invoices } = await driverClient.from("invoices").select("id");
    const { data: payments } = await driverClient.from("payments").select("id");

    const invoicesBlocked = !invoices || invoices.length === 0;
    const paymentsBlocked = !payments || payments.length === 0;

    await driverClient.auth.signOut();

    reporter.assert(
      invoicesBlocked && paymentsBlocked,
      step,
      "Driver cannot see invoices/payments",
      `Invoices: ${invoices?.length ?? 0}, Payments: ${payments?.length ?? 0}`
    );
  } catch (err: any) {
    reporter.fail(step, "Driver cannot see invoices/payments", err.message);
  }

  // --- Step 2: Customer cannot see carriers ---
  step++;
  try {
    const customerClient = createAnonClient();
    const { error: loginErr } = await customerClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.customer.email,
      password: TEST_ACCOUNTS.customer.password,
    });

    if (loginErr) throw new Error(`Customer login failed: ${loginErr.message}`);

    const { data: carriers } = await customerClient.from("carriers").select("id");
    const { data: settlements } = await customerClient.from("carrier_settlements").select("id");

    const carriersBlocked = !carriers || carriers.length === 0;
    const settlementsBlocked = !settlements || settlements.length === 0;

    await customerClient.auth.signOut();

    reporter.assert(
      carriersBlocked && settlementsBlocked,
      step,
      "Customer cannot see carriers/settlements",
      `Carriers: ${carriers?.length ?? 0}, Settlements: ${settlements?.length ?? 0}`
    );
  } catch (err: any) {
    reporter.fail(step, "Customer cannot see carriers/settlements", err.message);
  }

  // --- Step 3: Carrier cannot see audit_log ---
  step++;
  try {
    const carrierClient = createAnonClient();
    const { error: loginErr } = await carrierClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.carrier.email,
      password: TEST_ACCOUNTS.carrier.password,
    });

    if (loginErr) throw new Error(`Carrier login failed: ${loginErr.message}`);

    const { data: auditLogs } = await carrierClient.from("audit_log").select("id");
    const auditBlocked = !auditLogs || auditLogs.length === 0;

    // Carrier should NOT see other carrier's data
    const { data: allCarriers } = await carrierClient.from("carriers").select("id");
    const onlyOwnCarrier = !allCarriers || allCarriers.length <= 1;

    await carrierClient.auth.signOut();

    reporter.assert(
      auditBlocked,
      step,
      "Carrier cannot see audit_log",
      `Audit entries: ${auditLogs?.length ?? 0}, Own carriers only: ${onlyOwnCarrier}`
    );
  } catch (err: any) {
    reporter.fail(step, "Carrier cannot see audit_log", err.message);
  }

  // --- Step 4: Carrier cannot see customer invoices or payments ---
  step++;
  try {
    const carrierClient2 = createAnonClient();
    const { error: loginErr } = await carrierClient2.auth.signInWithPassword({
      email: TEST_ACCOUNTS.carrier.email,
      password: TEST_ACCOUNTS.carrier.password,
    });

    if (loginErr) throw new Error(`Carrier login failed: ${loginErr.message}`);

    const { data: invoices } = await carrierClient2.from("invoices").select("id");
    const { data: payments } = await carrierClient2.from("payments").select("id");
    const { data: customers } = await carrierClient2.from("customers").select("id");

    const invoicesBlocked = !invoices || invoices.length === 0;
    const paymentsBlocked = !payments || payments.length === 0;
    const customersBlocked = !customers || customers.length === 0;

    await carrierClient2.auth.signOut();

    reporter.assert(
      invoicesBlocked && paymentsBlocked && customersBlocked,
      step,
      "Carrier cannot see invoices/payments/customers",
      `Invoices: ${invoices?.length ?? 0}, Payments: ${payments?.length ?? 0}, Customers: ${customers?.length ?? 0}`
    );
  } catch (err: any) {
    reporter.fail(step, "Carrier cannot see invoices/payments/customers", err.message);
  }

  // --- Step 5: AccountStatusGate covers all non-active statuses ---
  step++;
  try {
    // Read the AccountStatusGate source to verify STATUS_CONFIG keys
    const fs = require("fs");
    const path = require("path");
    const gatePath = path.resolve(__dirname, "../../../src/components/shared/AccountStatusGate.tsx");
    const gateSource = fs.readFileSync(gatePath, "utf-8");

    const requiredStatuses = ["pending", "inactive", "suspended", "deactivated", "rejected"];
    const missing: string[] = [];

    for (const status of requiredStatuses) {
      // Check for the status key in STATUS_CONFIG
      const regex = new RegExp(`\\b${status}\\b\\s*[:}]|["']${status}["']\\s*:`, "m");
      if (!regex.test(gateSource)) {
        missing.push(status);
      }
    }

    reporter.assert(
      missing.length === 0,
      step,
      "AccountStatusGate covers all statuses",
      missing.length === 0
        ? `All 5 statuses handled: ${requiredStatuses.join(", ")}`
        : `Missing statuses: ${missing.join(", ")}`
    );
  } catch (err: any) {
    reporter.fail(step, "AccountStatusGate covers all statuses", err.message);
  }

  // --- Step 6: Admin can see all tables ---
  step++;
  try {
    const adminClient = createAnonClient();
    const { error: loginErr } = await adminClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.admin.email,
      password: TEST_ACCOUNTS.admin.password,
    });

    if (loginErr) throw new Error(`Admin login failed: ${loginErr.message}`);

    const tables = ["customers", "carriers", "drivers", "trucks", "sites", "materials", "rates"];
    const results: Record<string, number> = {};
    let allAccessible = true;

    for (const table of tables) {
      const { data, error } = await adminClient.from(table).select("id").limit(1);
      if (error) {
        allAccessible = false;
        results[table] = -1;
      } else {
        results[table] = data?.length ?? 0;
      }
    }

    await adminClient.auth.signOut();

    const detail = Object.entries(results)
      .map(([t, c]) => `${t}:${c === -1 ? "ERR" : c}`)
      .join(", ");

    reporter.assert(
      allAccessible,
      step,
      "Admin can access all tables",
      detail
    );
  } catch (err: any) {
    reporter.fail(step, "Admin can access all tables", err.message);
  }

  reporter.printReport();
  return reporter;
}
