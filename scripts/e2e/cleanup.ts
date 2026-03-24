#!/usr/bin/env npx tsx
/**
 * JFT E2E Sandbox: Enhanced Cleanup
 *
 * Deletes ALL test data in FK-safe order, including:
 *   1. QB Sandbox objects (payments, billpayments, invoices, bills) -- with auto-refresh + retry
 *   2. Supabase records (all TEST_* entities and workflow data)
 *   3. Auth users (all @jft-test.local accounts)
 *   4. Cron test artifacts (invoices/settlements created by test 11)
 *
 * Enhancements:
 *   - QB token auto-refresh before QBO API calls
 *   - Auto-retry on 401 with token refresh
 *   - Handles second customer (TEST_Kaufman_Co) and all TEST_* prefixed entities
 *   - Cleans notifications, qb_sync_log, and cron artifacts
 *   - Better error reporting for 401 errors
 *
 * Usage:  npx tsx scripts/e2e/cleanup.ts
 */

import {
  createAdminClient,
  assertSandboxMode,
  loadEnv,
  getQBTokensWithRefresh,
  refreshQBToken,
} from "./lib/test-helpers";
import { deleteTestAccounts } from "./lib/test-accounts";

// ---------------------------------------------------------------------------
// QB Sandbox Cleanup Helpers
// ---------------------------------------------------------------------------

const QBO_SANDBOX_BASE = "https://sandbox-quickbooks.api.intuit.com/v3/company";

async function queryQBO(
  accessToken: string,
  realmId: string,
  entityType: string
): Promise<Array<{ Id: string; SyncToken: string; [key: string]: unknown }>> {
  const allResults: Array<{ Id: string; SyncToken: string }> = [];
  let startPosition = 1;
  const maxResults = 1000;

  while (true) {
    const query = `SELECT * FROM ${entityType} STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;
    const res = await fetch(
      `${QBO_SANDBOX_BASE}/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=75`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        console.warn(`    TOKEN EXPIRED during ${entityType} query -- will attempt refresh`);
      } else {
        console.warn(`    Warning: QBO query failed for ${entityType}: ${res.status}`);
      }
      break;
    }

    const data = await res.json();
    const qr = data.QueryResponse;
    if (!qr) break;

    const entities = qr[entityType] as Array<{ Id: string; SyncToken: string }> | undefined;
    if (!entities || entities.length === 0) break;

    allResults.push(...entities);
    if (entities.length < maxResults) break;
    startPosition += maxResults;
  }

  return allResults;
}

async function deleteQBEntity(
  accessToken: string,
  realmId: string,
  entityType: string,
  entityId: string,
  syncToken: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${QBO_SANDBOX_BASE}/${realmId}/${entityType.toLowerCase()}?operation=delete&minorversion=75`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ Id: entityId, SyncToken: syncToken }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 400 && text.includes("already been deleted")) return true;
      if (res.status === 401) {
        console.warn(`    TOKEN EXPIRED deleting ${entityType} ${entityId}`);
        return false;
      }
      console.warn(`    Warning: Failed to delete ${entityType} ${entityId}: ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`    Warning: ${entityType} ${entityId} delete error: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

/**
 * Delete all QBO entities of a given type.
 * If a 401 is encountered, returns -1 to signal the caller to refresh and retry.
 */
async function deleteAllQBEntities(
  accessToken: string,
  realmId: string,
  entityType: string
): Promise<number> {
  const entities = await queryQBO(accessToken, realmId, entityType);
  if (entities.length === 0) return 0;

  let deleted = 0;
  let got401 = false;
  for (const entity of entities) {
    const ok = await deleteQBEntity(accessToken, realmId, entityType, entity.Id, entity.SyncToken);
    if (ok) {
      deleted++;
    } else {
      // Check if we need to signal 401
      got401 = true;
    }
  }
  return got401 && deleted === 0 ? -1 : deleted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  loadEnv();
  const supabase = createAdminClient();
  await assertSandboxMode(supabase);

  console.log("Cleaning up sandbox test data...\n");

  let totalDeleted = 0;

  // =========================================================================
  // Phase 1: QB Sandbox Cleanup -- with auto-refresh + retry on 401
  // =========================================================================
  console.log("QB Sandbox Cleanup:");

  let qbTokens = await getQBTokensWithRefresh(supabase);
  const qbDeleted: Record<string, number> = {};

  if (!qbTokens) {
    console.log("  QB not connected -- skipping QB cleanup\n");
  } else {
    // FK-safe order: delete child entities before parents
    // Payments and BillPayments BEFORE Invoices and Bills
    const entityTypes = [
      "Deposit",
      "Payment",
      "BillPayment",
      "CreditMemo",
      "Invoice",
      "Bill",
      "JournalEntry",
      "VendorCredit",
    ];

    for (const entityType of entityTypes) {
      let count = await deleteAllQBEntities(qbTokens.accessToken, qbTokens.realmId, entityType);

      // If we got a 401, attempt refresh and retry once
      if (count === -1) {
        console.log(`    TOKEN EXPIRED -- attempting refresh for ${entityType}...`);
        const refreshed = await refreshQBToken(supabase);
        if (refreshed) {
          qbTokens = { accessToken: refreshed.accessToken, realmId: refreshed.realmId };
          count = await deleteAllQBEntities(qbTokens.accessToken, qbTokens.realmId, entityType);
          if (count === -1) count = 0; // Still failing after refresh
        } else {
          console.error(`    QB token refresh failed. Skipping remaining QB cleanup.`);
          break;
        }
      }

      qbDeleted[entityType] = Math.max(0, count);
      if (count > 0) {
        console.log(`  ${entityType}: ${count} deleted`);
      }
    }

    const totalQB = Object.values(qbDeleted).reduce((a, b) => a + b, 0);
    if (totalQB === 0) {
      console.log("  No QBO entities found to delete");
    }
    console.log("");
  }

  // =========================================================================
  // Phase 2: Supabase Cleanup
  // =========================================================================
  console.log("Supabase Cleanup:");

  // --- Resolve test entity IDs ---
  // Both TEST_DR_Horton and TEST_Kaufman_Co are caught by TEST_% pattern
  const { data: testCustomers } = await supabase
    .from("customers")
    .select("id, name")
    .like("name", "TEST_%");
  const customerIds = testCustomers?.map((c) => c.id) ?? [];

  const { data: testCarriers } = await supabase
    .from("carriers")
    .select("id, name")
    .like("name", "TEST_%");
  const carrierIds = testCarriers?.map((c) => c.id) ?? [];

  const { data: testDrivers } = await supabase
    .from("drivers")
    .select("id, name")
    .like("name", "TEST_%");
  const driverIds = testDrivers?.map((d) => d.id) ?? [];

  const { data: testTrucks } = await supabase
    .from("trucks")
    .select("id, number")
    .like("number", "TEST_%");
  const truckIds = testTrucks?.map((t) => t.id) ?? [];

  const { data: testSites } = await supabase
    .from("sites")
    .select("id, name")
    .like("name", "TEST_%");
  const siteIds = testSites?.map((s) => s.id) ?? [];

  console.log(
    `  Found: ${customerIds.length} customers, ${carrierIds.length} carriers, ` +
      `${driverIds.length} drivers, ${truckIds.length} trucks, ${siteIds.length} sites\n`
  );

  // --- Notifications (for test users) ---
  const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const testUserIds =
    allUsers?.users
      ?.filter((u) => u.email?.endsWith("@jft-test.local"))
      .map((u) => u.id) ?? [];

  if (testUserIds.length > 0) {
    const { count: notifCount } = await supabase
      .from("notifications")
      .delete({ count: "exact" })
      .in("user_id", testUserIds);
    const nc = notifCount ?? 0;
    if (nc > 0) {
      totalDeleted += nc;
      console.log(`  Notifications: ${nc} deleted`);
    }
  }

  // --- QB Sync Log ---
  const allEntityIds = [...customerIds, ...carrierIds, ...driverIds, ...truckIds];
  if (allEntityIds.length > 0) {
    const { count: syncLogCount } = await supabase
      .from("qb_sync_log")
      .delete({ count: "exact" })
      .in("entity_id", allEntityIds);
    const slc = syncLogCount ?? 0;
    if (slc > 0) {
      totalDeleted += slc;
      console.log(`  Sync log entries: ${slc} deleted`);
    }
  }

  // Also clean sync log entries referencing test invoices/settlements
  if (customerIds.length > 0) {
    const { data: testInvs } = await supabase
      .from("invoices")
      .select("id")
      .in("customer_id", customerIds);
    const invIds = testInvs?.map((i) => i.id) ?? [];
    if (invIds.length > 0) {
      const { count } = await supabase
        .from("qb_sync_log")
        .delete({ count: "exact" })
        .in("entity_id", invIds);
      const c = count ?? 0;
      if (c > 0) {
        totalDeleted += c;
        console.log(`  Sync log (invoices): ${c} deleted`);
      }
    }
  }

  if (carrierIds.length > 0) {
    const { data: testSets } = await supabase
      .from("carrier_settlements")
      .select("id")
      .in("carrier_id", carrierIds);
    const setIds = testSets?.map((s) => s.id) ?? [];
    if (setIds.length > 0) {
      const { count } = await supabase
        .from("qb_sync_log")
        .delete({ count: "exact" })
        .in("entity_id", setIds);
      const c = count ?? 0;
      if (c > 0) {
        totalDeleted += c;
        console.log(`  Sync log (settlements): ${c} deleted`);
      }
    }
  }

  // --- Carrier settlement lines -> settlements ---
  if (carrierIds.length > 0) {
    const { data: testSettlements } = await supabase
      .from("carrier_settlements")
      .select("id")
      .in("carrier_id", carrierIds);
    const settlementIds = testSettlements?.map((s) => s.id) ?? [];

    if (settlementIds.length > 0) {
      const { count } = await supabase
        .from("carrier_settlement_lines")
        .delete({ count: "exact" })
        .in("settlement_id", settlementIds);
      totalDeleted += count ?? 0;
      console.log(`  Settlement lines: ${count ?? 0} deleted`);

      const { count: setCount } = await supabase
        .from("carrier_settlements")
        .delete({ count: "exact" })
        .in("id", settlementIds);
      totalDeleted += setCount ?? 0;
      console.log(`  Settlements: ${setCount ?? 0} deleted`);
    }

    // By prefix too (catches cron-generated settlements)
    const { count: prefixSetCount } = await supabase
      .from("carrier_settlements")
      .delete({ count: "exact" })
      .like("settlement_number", "TEST-%");
    if (prefixSetCount && prefixSetCount > 0) {
      totalDeleted += prefixSetCount;
      console.log(`  Settlements (by prefix): ${prefixSetCount} deleted`);
    }
  }

  // --- Tax forms ---
  if (carrierIds.length > 0) {
    const { count } = await supabase
      .from("tax_forms")
      .delete({ count: "exact" })
      .in("carrier_id", carrierIds);
    const c = count ?? 0;
    if (c > 0) {
      totalDeleted += c;
      console.log(`  Tax forms: ${c} deleted`);
    }
  }

  // --- Payments -> Invoice line items -> Invoices ---
  // This catches invoices from both customer IDs AND cron-generated TEST-* prefixed invoices
  if (customerIds.length > 0) {
    const { data: testInvoices } = await supabase
      .from("invoices")
      .select("id")
      .in("customer_id", customerIds);
    const invoiceIds = testInvoices?.map((i) => i.id) ?? [];

    const { data: prefixInvoices } = await supabase
      .from("invoices")
      .select("id")
      .like("invoice_number", "TEST-%");
    const prefixInvoiceIds = prefixInvoices?.map((i) => i.id) ?? [];

    const allInvoiceIds = [...new Set([...invoiceIds, ...prefixInvoiceIds])];

    if (allInvoiceIds.length > 0) {
      const { count: payCount } = await supabase
        .from("payments")
        .delete({ count: "exact" })
        .in("invoice_id", allInvoiceIds);
      totalDeleted += payCount ?? 0;
      console.log(`  Payments: ${payCount ?? 0} deleted`);

      const { count: lineCount } = await supabase
        .from("invoice_line_items")
        .delete({ count: "exact" })
        .in("invoice_id", allInvoiceIds);
      totalDeleted += lineCount ?? 0;
      console.log(`  Invoice line items: ${lineCount ?? 0} deleted`);

      const { count: invCount } = await supabase
        .from("invoices")
        .delete({ count: "exact" })
        .in("id", allInvoiceIds);
      totalDeleted += invCount ?? 0;
      console.log(`  Invoices: ${invCount ?? 0} deleted`);
    }
  }

  // --- Cron test artifacts: isolation test invoices ---
  {
    const { count: isoCount } = await supabase
      .from("invoices")
      .delete({ count: "exact" })
      .eq("invoice_number", "TEST-ISOLATION-001");
    if (isoCount && isoCount > 0) {
      totalDeleted += isoCount;
      console.log(`  Isolation test invoices: ${isoCount} deleted`);
    }
  }

  // --- Deliveries -> Dispatches ---
  const allDispatchIds: string[] = [];

  const { data: testPOs } = await supabase
    .from("purchase_orders")
    .select("id")
    .like("po_number", "TEST-%");
  const poIds = testPOs?.map((p) => p.id) ?? [];

  if (driverIds.length > 0) {
    const { data } = await supabase.from("dispatches").select("id").in("driver_id", driverIds);
    if (data) allDispatchIds.push(...data.map((d) => d.id));
  }

  if (carrierIds.length > 0) {
    const { data } = await supabase.from("dispatches").select("id").in("carrier_id", carrierIds);
    if (data) allDispatchIds.push(...data.map((d) => d.id));
  }

  if (poIds.length > 0) {
    const { data } = await supabase.from("dispatches").select("id").in("purchase_order_id", poIds);
    if (data) allDispatchIds.push(...data.map((d) => d.id));
  }

  const uniqueDispatchIds = [...new Set(allDispatchIds)];

  if (uniqueDispatchIds.length > 0) {
    const { count: delCount } = await supabase
      .from("deliveries")
      .delete({ count: "exact" })
      .in("dispatch_id", uniqueDispatchIds);
    totalDeleted += delCount ?? 0;
    console.log(`  Deliveries: ${delCount ?? 0} deleted`);

    const { count: dispCount } = await supabase
      .from("dispatches")
      .delete({ count: "exact" })
      .in("id", uniqueDispatchIds);
    totalDeleted += dispCount ?? 0;
    console.log(`  Dispatches: ${dispCount ?? 0} deleted`);
  }

  // --- Orders ---
  if (customerIds.length > 0 || poIds.length > 0) {
    const allOrderIds: string[] = [];

    if (customerIds.length > 0) {
      const { data } = await supabase.from("orders").select("id").in("customer_id", customerIds);
      if (data) allOrderIds.push(...data.map((o) => o.id));
    }

    if (poIds.length > 0) {
      const { data } = await supabase.from("orders").select("id").in("purchase_order_id", poIds);
      if (data) allOrderIds.push(...data.map((o) => o.id));
    }

    const uniqueOrderIds = [...new Set(allOrderIds)];
    if (uniqueOrderIds.length > 0) {
      const { count } = await supabase.from("orders").delete({ count: "exact" }).in("id", uniqueOrderIds);
      totalDeleted += count ?? 0;
      console.log(`  Orders: ${count ?? 0} deleted`);
    }
  }

  // --- Purchase orders ---
  if (poIds.length > 0) {
    const { count } = await supabase.from("purchase_orders").delete({ count: "exact" }).in("id", poIds);
    totalDeleted += count ?? 0;
    console.log(`  Purchase orders: ${count ?? 0} deleted`);
  }

  // --- Rates ---
  if (customerIds.length > 0 || carrierIds.length > 0) {
    let rateCount = 0;

    if (customerIds.length > 0) {
      const { count } = await supabase
        .from("rates")
        .delete({ count: "exact" })
        .eq("type", "customer")
        .in("customer_id", customerIds);
      rateCount += count ?? 0;
    }

    if (carrierIds.length > 0) {
      const { count } = await supabase
        .from("rates")
        .delete({ count: "exact" })
        .eq("type", "carrier")
        .in("carrier_id", carrierIds);
      rateCount += count ?? 0;
    }

    totalDeleted += rateCount;
    console.log(`  Rates: ${rateCount} deleted`);
  }

  // --- Site contacts ---
  if (siteIds.length > 0) {
    const { count } = await supabase.from("site_contacts").delete({ count: "exact" }).in("site_id", siteIds);
    const c = count ?? 0;
    if (c > 0) {
      totalDeleted += c;
      console.log(`  Site contacts: ${c} deleted`);
    }
  }

  // --- Customer addresses ---
  if (customerIds.length > 0) {
    const { count } = await supabase.from("customer_addresses").delete({ count: "exact" }).in("customer_id", customerIds);
    const c = count ?? 0;
    if (c > 0) {
      totalDeleted += c;
      console.log(`  Customer addresses: ${c} deleted`);
    }
  }

  // --- Documents ---
  if (allEntityIds.length > 0) {
    const { count } = await supabase.from("documents").delete({ count: "exact" }).in("entity_id", allEntityIds);
    const c = count ?? 0;
    if (c > 0) {
      totalDeleted += c;
      console.log(`  Documents: ${c} deleted`);
    }
  }

  // --- Auth users + profiles ---
  console.log("\n  Deleting test auth users...");
  const usersDeleted = await deleteTestAccounts(supabase);
  totalDeleted += usersDeleted;

  // --- Drivers ---
  if (driverIds.length > 0) {
    await supabase.from("drivers").update({ profile_id: null, truck_id: null }).in("id", driverIds);
    const { count } = await supabase.from("drivers").delete({ count: "exact" }).in("id", driverIds);
    totalDeleted += count ?? 0;
    console.log(`  Drivers: ${count ?? 0} deleted`);
  }

  // --- Trucks ---
  if (truckIds.length > 0) {
    const { count } = await supabase.from("trucks").delete({ count: "exact" }).in("id", truckIds);
    totalDeleted += count ?? 0;
    console.log(`  Trucks: ${count ?? 0} deleted`);
  }

  // --- Sites ---
  if (siteIds.length > 0) {
    const { count } = await supabase.from("sites").delete({ count: "exact" }).in("id", siteIds);
    totalDeleted += count ?? 0;
    console.log(`  Sites: ${count ?? 0} deleted`);
  }

  // --- Carriers ---
  if (carrierIds.length > 0) {
    const { count } = await supabase.from("carriers").delete({ count: "exact" }).in("id", carrierIds);
    totalDeleted += count ?? 0;
    console.log(`  Carriers: ${count ?? 0} deleted`);
  }

  // --- Customers (both TEST_DR_Horton and TEST_Kaufman_Co) ---
  if (customerIds.length > 0) {
    const { count } = await supabase.from("customers").delete({ count: "exact" }).in("id", customerIds);
    totalDeleted += count ?? 0;
    console.log(`  Customers: ${count ?? 0} deleted`);
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n" + "=".repeat(50));

  if (qbTokens) {
    const totalQB = Object.values(qbDeleted).reduce((a, b) => a + b, 0);
    if (totalQB > 0) {
      console.log("  QB Sandbox Cleanup:");
      for (const [type, count] of Object.entries(qbDeleted)) {
        if (count > 0) console.log(`    ${type}: ${count} deleted`);
      }
      console.log("");
    }
  }

  console.log(`  [OK] Cleanup complete. ${totalDeleted} Supabase records removed.`);
  console.log("=".repeat(50));
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
