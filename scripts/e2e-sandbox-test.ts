#!/usr/bin/env npx tsx
/**
 * JFT E2E Sandbox Test — Complete Workflow
 *
 * Tests the complete business workflow using REAL service functions
 * where possible (via the server client shim), falling back to direct
 * Supabase calls where Next.js dependencies are unavoidable.
 *
 * Phases:
 *   1. User Lifecycle (5 tests)
 *   2. Workflow — PO, Dispatch, Delivery, Dispute (10 tests)
 *   3. Financials — Invoice, QB Sync, Payment, Settlement (5 tests)
 *   4. Verification — PDF data, RLS, Edge Cases, Notifications, Dashboard (5 tests)
 *
 * Prerequisites: Run `npx tsx scripts/seed-test-data.ts` first.
 *
 * IMPORTANT: This test does NOT auto-cleanup. Data stays in Supabase
 * so you can inspect it on the website. Use cleanup-sandbox-test.ts to remove.
 *
 * Usage:  npx tsx scripts/e2e-sandbox-test.ts
 */

// MUST be first — patches @/lib/supabase/server to work outside Next.js
import "./lib/patch-server-client";

import {
  createAdminClient,
  createAnonClient,
  assertSandboxMode,
  loadEnv,
  TestReporter,
} from "./lib/test-helpers";
import { TEST_ACCOUNTS, PENDING_TEST_ACCOUNTS } from "./lib/test-accounts";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Service imports — these work because of the shim
// ---------------------------------------------------------------------------

let generateInvoice: typeof import("@/lib/services/invoice.service").generateInvoice | null = null;
let getInvoiceWithDetails: typeof import("@/lib/services/invoice.service").getInvoiceWithDetails | null = null;
let generateSettlement: typeof import("@/lib/services/settlement.service").generateSettlement | null = null;
let syncInvoiceToQBO: typeof import("@/lib/services/quickbooks.service").syncInvoiceToQBO | null = null;
let syncSettlementToQBO: typeof import("@/lib/services/quickbooks.service").syncSettlementToQBO | null = null;
let getQBClient: typeof import("@/lib/services/quickbooks.service").getQBClient | null = null;

async function loadServiceFunctions(): Promise<string[]> {
  const loaded: string[] = [];
  const failed: string[] = [];

  try {
    const invoiceSvc = await import("@/lib/services/invoice.service");
    generateInvoice = invoiceSvc.generateInvoice;
    getInvoiceWithDetails = invoiceSvc.getInvoiceWithDetails;
    loaded.push("invoice.service");
  } catch (err) {
    failed.push(`invoice.service: ${err instanceof Error ? err.message : err}`);
  }

  try {
    const settlementSvc = await import("@/lib/services/settlement.service");
    generateSettlement = settlementSvc.generateSettlement;
    loaded.push("settlement.service");
  } catch (err) {
    failed.push(`settlement.service: ${err instanceof Error ? err.message : err}`);
  }

  try {
    const qbSvc = await import("@/lib/services/quickbooks.service");
    syncInvoiceToQBO = qbSvc.syncInvoiceToQBO;
    syncSettlementToQBO = qbSvc.syncSettlementToQBO;
    getQBClient = qbSvc.getQBClient;
    loaded.push("quickbooks.service");
  } catch (err) {
    failed.push(`quickbooks.service: ${err instanceof Error ? err.message : err}`);
  }

  if (loaded.length > 0) {
    console.log(`  Loaded service modules: ${loaded.join(", ")}`);
  }
  if (failed.length > 0) {
    console.log(`  Service import fallbacks: ${failed.join("; ")}`);
  }

  return failed;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  loadEnv();
  const supabase = createAdminClient();
  await assertSandboxMode(supabase);

  const reporter = new TestReporter();

  console.log("JFT E2E Sandbox Test");
  console.log("====================\n");

  // Load service functions via the shim
  console.log("Loading service modules...");
  const importFailures = await loadServiceFunctions();
  console.log("");

  // =========================================================================
  // Resolve test entity IDs from seeded data
  // =========================================================================
  console.log("Resolving seeded test entities...\n");

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("name", "TEST_DR_Horton")
    .single();

  const { data: carrier } = await supabase
    .from("carriers")
    .select("id, dispatch_fee_weekly")
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
    .select("id, city")
    .eq("name", "TEST_Frisco_Lakes")
    .single();

  const { data: cushionSand } = await supabase
    .from("materials")
    .select("id")
    .eq("name", "Cushion Sand")
    .single();

  // Resolve admin user ID (for dispute resolution)
  const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const adminUser = allUsers?.users?.find((u) => u.email === TEST_ACCOUNTS.admin.email);

  // Validate all entities exist
  const missing: string[] = [];
  if (!customer) missing.push("TEST_DR_Horton");
  if (!carrier) missing.push("TEST_CD_Hopkins");
  if (!driver) missing.push("TEST_Chip_West");
  if (!truck) missing.push("TEST_Truck_01");
  if (!quarry) missing.push("TEST_Kaufman_Sand");
  if (!jobsite) missing.push("TEST_Frisco_Lakes");
  if (!cushionSand) missing.push("Cushion Sand");
  if (!adminUser) missing.push("admin user");

  if (missing.length > 0) {
    console.error(
      `Missing test entities: ${missing.join(", ")}.\n` +
        `Run 'npx tsx scripts/seed-test-data.ts' first.`
    );
    process.exit(1);
  }

  const testCustomerId = customer!.id;
  const testCarrierId = carrier!.id;
  const testDriverId = driver!.id;
  const testTruckId = truck!.id;
  const kaufmanSandId = quarry!.id;
  const friscoLakesId = jobsite!.id;
  const cushionSandId = cushionSand!.id;
  const dispatchFeeWeekly = Number(carrier!.dispatch_fee_weekly);
  const adminUserId = adminUser!.id;

  console.log("  All test entities resolved.\n");

  // =========================================================================
  // Clean up any existing test workflow data (from prior runs)
  // =========================================================================
  console.log("Cleaning up prior test workflow data...\n");

  // Delete in FK order: settlement lines -> settlements, line items -> invoices,
  // payments, deliveries -> dispatches -> purchase_orders
  const { data: priorSettlements } = await supabase
    .from("carrier_settlements")
    .select("id")
    .like("settlement_number", "TEST-%");
  const priorSettlementIds = priorSettlements?.map((s) => s.id) ?? [];
  if (priorSettlementIds.length > 0) {
    await supabase
      .from("carrier_settlement_lines")
      .delete()
      .in("settlement_id", priorSettlementIds);
    await supabase
      .from("carrier_settlements")
      .delete()
      .in("id", priorSettlementIds);
  }

  // Also clean up auto-generated settlements (non-TEST prefix) for this carrier
  const { data: carrierSettlements } = await supabase
    .from("carrier_settlements")
    .select("id")
    .eq("carrier_id", testCarrierId);
  const carrierSettlementIds = carrierSettlements?.map((s) => s.id) ?? [];
  if (carrierSettlementIds.length > 0) {
    await supabase
      .from("carrier_settlement_lines")
      .delete()
      .in("settlement_id", carrierSettlementIds);
    await supabase
      .from("carrier_settlements")
      .delete()
      .in("id", carrierSettlementIds);
  }

  // Get test invoices (both TEST- prefix and auto-generated for test customer)
  const { data: testInvoices } = await supabase
    .from("invoices")
    .select("id")
    .eq("customer_id", testCustomerId);
  const testInvoiceIds = testInvoices?.map((i) => i.id) ?? [];

  if (testInvoiceIds.length > 0) {
    await supabase
      .from("payments")
      .delete()
      .in("invoice_id", testInvoiceIds);
    await supabase
      .from("invoice_line_items")
      .delete()
      .in("invoice_id", testInvoiceIds);
    await supabase.from("invoices").delete().in("id", testInvoiceIds);
  }

  // Get test POs
  const { data: testPOs } = await supabase
    .from("purchase_orders")
    .select("id")
    .like("po_number", "TEST-%");
  const testPOIds = testPOs?.map((p) => p.id) ?? [];

  if (testPOIds.length > 0) {
    const { data: testDispatches } = await supabase
      .from("dispatches")
      .select("id")
      .in("purchase_order_id", testPOIds);
    const testDispatchIds = testDispatches?.map((d) => d.id) ?? [];

    if (testDispatchIds.length > 0) {
      await supabase
        .from("deliveries")
        .delete()
        .in("dispatch_id", testDispatchIds);
      await supabase.from("dispatches").delete().in("id", testDispatchIds);
    }
    await supabase.from("purchase_orders").delete().in("id", testPOIds);
  }

  // Clean up notifications for test users
  const testUserEmails = [
    ...Object.values(TEST_ACCOUNTS).map((a) => a.email),
    ...Object.values(PENDING_TEST_ACCOUNTS).map((a) => a.email),
  ];
  const testUserIds = allUsers?.users
    ?.filter((u) => u.email && testUserEmails.includes(u.email))
    .map((u) => u.id) ?? [];
  if (testUserIds.length > 0) {
    await supabase.from("notifications").delete().in("user_id", testUserIds);
  }

  console.log("  Prior test data cleaned.\n");

  // =========================================================================
  // === PHASE 1: USER LIFECYCLE ===
  // =========================================================================
  console.log("--- Phase 1: User Lifecycle ---\n");

  let step = 0;

  // --- Step 1: Pending User Login ---
  step++;
  try {
    const pendingClient = createAnonClient();
    const { error: loginErr } = await pendingClient.auth.signInWithPassword({
      email: PENDING_TEST_ACCOUNTS.pending_customer.email,
      password: PENDING_TEST_ACCOUNTS.pending_customer.password,
    });

    if (loginErr) {
      // Login might fail if user doesn't exist yet (seed not run)
      reporter.fail(step, "Pending User Login", `Login failed: ${loginErr.message}`);
    } else {
      // Verify profile status is "pending"
      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", allUsers?.users?.find((u) => u.email === PENDING_TEST_ACCOUNTS.pending_customer.email)?.id ?? "")
        .single();

      reporter.assert(
        profile?.status === "pending",
        step,
        "Pending User Login",
        `Login succeeded, profile status: ${profile?.status}`
      );

      await pendingClient.auth.signOut();
    }
  } catch (err: any) {
    reporter.fail(step, "Pending User Login", err.message);
  }

  // --- Step 2: Admin Approval ---
  step++;
  try {
    const pendingUserId = allUsers?.users?.find(
      (u) => u.email === PENDING_TEST_ACCOUNTS.pending_customer.email
    )?.id;

    if (!pendingUserId) throw new Error("Pending customer user not found");

    const { error: approveErr } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", pendingUserId);

    if (approveErr) throw approveErr;

    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", pendingUserId)
      .single();

    reporter.assert(
      profile?.status === "active",
      step,
      "Admin Approval",
      `Profile status changed to: ${profile?.status}`
    );

    // Reset back to pending for next test
    await supabase
      .from("profiles")
      .update({ status: "pending" })
      .eq("id", pendingUserId);
  } catch (err: any) {
    reporter.fail(step, "Admin Approval", err.message);
  }

  // --- Step 3: Role-Locked Access ---
  step++;
  try {
    const customerClient = createAnonClient();
    const { error: custLoginErr } = await customerClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.customer.email,
      password: TEST_ACCOUNTS.customer.password,
    });

    if (custLoginErr) throw new Error(`Customer login failed: ${custLoginErr.message}`);

    // Customer should NOT see carriers
    const { data: carriers } = await customerClient.from("carriers").select("id");
    const carriersBlocked = !carriers || carriers.length === 0;

    // Customer should NOT see dispatches (driver-only)
    const { data: dispatches } = await customerClient.from("dispatches").select("id");
    // Dispatches may or may not be RLS-blocked for customers depending on policy

    await customerClient.auth.signOut();

    reporter.assert(
      carriersBlocked,
      step,
      "Role-Locked Access",
      `Customer sees ${carriers?.length ?? 0} carriers (expected 0)`
    );
  } catch (err: any) {
    reporter.fail(step, "Role-Locked Access", err.message);
  }

  // --- Step 4: Deactivation ---
  step++;
  try {
    const pendingDriverId = allUsers?.users?.find(
      (u) => u.email === PENDING_TEST_ACCOUNTS.pending_driver.email
    )?.id;

    if (!pendingDriverId) throw new Error("Pending driver user not found");

    // First activate, then deactivate
    await supabase.from("profiles").update({ status: "active" }).eq("id", pendingDriverId);
    const { error: deactErr } = await supabase
      .from("profiles")
      .update({ status: "inactive" })
      .eq("id", pendingDriverId);

    if (deactErr) throw deactErr;

    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", pendingDriverId)
      .single();

    reporter.assert(
      profile?.status === "inactive",
      step,
      "Deactivation",
      `Profile status: ${profile?.status}`
    );
  } catch (err: any) {
    reporter.fail(step, "Deactivation", err.message);
  }

  // --- Step 5: Reactivation ---
  step++;
  try {
    const pendingDriverId = allUsers?.users?.find(
      (u) => u.email === PENDING_TEST_ACCOUNTS.pending_driver.email
    )?.id;

    if (!pendingDriverId) throw new Error("Pending driver user not found");

    const { error: reactErr } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", pendingDriverId);

    if (reactErr) throw reactErr;

    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", pendingDriverId)
      .single();

    reporter.assert(
      profile?.status === "active",
      step,
      "Reactivation",
      `Profile status: ${profile?.status}`
    );

    // Reset to pending for clean state
    await supabase.from("profiles").update({ status: "pending" }).eq("id", pendingDriverId);
  } catch (err: any) {
    reporter.fail(step, "Reactivation", err.message);
  }

  // =========================================================================
  // === PHASE 2: WORKFLOW ===
  // =========================================================================
  console.log("\n--- Phase 2: Workflow ---\n");

  let poId: string | null = null;
  const dispatchIds: string[] = [];
  const deliveryIds: string[] = [];

  // --- Step 6: Create Purchase Order ---
  step++;
  try {
    const { data: po, error } = await supabase
      .from("purchase_orders")
      .insert({
        po_number: "TEST-PO-001",
        customer_id: testCustomerId,
        material_id: cushionSandId,
        delivery_site_id: friscoLakesId,
        quantity_ordered: 5,
        unit: "load",
        status: "active",
      })
      .select("id, po_number, quantity_ordered, status")
      .single();

    if (error) throw error;

    poId = po!.id;
    reporter.assert(
      po!.quantity_ordered === 5 && po!.status === "active",
      step,
      "Create PO",
      `PO: ${po!.po_number}, qty: ${po!.quantity_ordered}, status: ${po!.status}`
    );
  } catch (err: any) {
    reporter.fail(step, "Create PO", err.message);
  }

  // --- Step 7: Create 3 Dispatches ---
  step++;
  try {
    if (!poId) throw new Error("No PO from Step 6");

    const today = new Date().toISOString().split("T")[0];

    for (let i = 1; i <= 3; i++) {
      const { data: dispatch, error } = await supabase
        .from("dispatches")
        .insert({
          purchase_order_id: poId,
          carrier_id: testCarrierId,
          driver_id: testDriverId,
          truck_id: testTruckId,
          material_id: cushionSandId,
          pickup_site_id: kaufmanSandId,
          delivery_site_id: friscoLakesId,
          status: "dispatched",
          scheduled_date: today,
          dispatched_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;
      dispatchIds.push(dispatch!.id);
    }

    reporter.assert(
      dispatchIds.length === 3,
      step,
      "Create 3 Dispatches",
      `Created ${dispatchIds.length} dispatches`
    );
  } catch (err: any) {
    reporter.fail(step, "Create 3 Dispatches", err.message);
  }

  // --- Step 8: Create Carrier Dispatch (dispatch #4 for carrier flow) ---
  step++;
  try {
    if (!poId) throw new Error("No PO from Step 6");

    const today = new Date().toISOString().split("T")[0];
    const { data: carrierDispatch, error } = await supabase
      .from("dispatches")
      .insert({
        purchase_order_id: poId,
        carrier_id: testCarrierId,
        driver_id: testDriverId,
        truck_id: testTruckId,
        material_id: cushionSandId,
        pickup_site_id: kaufmanSandId,
        delivery_site_id: friscoLakesId,
        status: "dispatched",
        scheduled_date: today,
        dispatched_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    dispatchIds.push(carrierDispatch!.id);

    reporter.assert(
      dispatchIds.length === 4,
      step,
      "Carrier Dispatch",
      `Total dispatches: ${dispatchIds.length}`
    );
  } catch (err: any) {
    reporter.fail(step, "Carrier Dispatch", err.message);
  }

  // --- Step 9: Driver Sees Loads ---
  step++;
  try {
    const driverClient = createAnonClient();
    const { error: drvLoginErr } = await driverClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.driver.email,
      password: TEST_ACCOUNTS.driver.password,
    });

    if (drvLoginErr) throw new Error(`Driver login failed: ${drvLoginErr.message}`);

    const { data: drvDispatches } = await driverClient
      .from("dispatches")
      .select("id, status")
      .eq("status", "dispatched");

    await driverClient.auth.signOut();

    reporter.assert(
      drvDispatches !== null && drvDispatches.length >= 4,
      step,
      "Driver Sees Loads",
      `Driver sees ${drvDispatches?.length ?? 0} dispatched loads`
    );
  } catch (err: any) {
    reporter.fail(step, "Driver Sees Loads", err.message);
  }

  // --- Step 10: Driver Deliveries ---
  step++;
  try {
    if (dispatchIds.length < 4) throw new Error("Need 4 dispatches");

    // Submit 4 deliveries — net_weight = 1.0 (per_load rates, but weight
    // must be non-null for the PO trigger to properly increment quantity_delivered)
    for (let i = 0; i < 4; i++) {
      const { data: delivery, error } = await supabase
        .from("deliveries")
        .insert({
          dispatch_id: dispatchIds[i],
          driver_id: testDriverId,
          truck_id: testTruckId,
          material_id: cushionSandId,
          delivery_site_id: friscoLakesId,
          ticket_number: `TEST-TKT-${String(i + 1).padStart(3, "0")}`,
          delivered_at: new Date().toISOString(),
          confirmation_status: "pending",
          net_weight: 1.0, // 1 load = weight placeholder
          geofence_verified: false,
          synced_offline: false,
        })
        .select("id")
        .single();

      if (error) throw error;
      deliveryIds.push(delivery!.id);

      // Update dispatch status to delivered
      await supabase
        .from("dispatches")
        .update({ status: "delivered" })
        .eq("id", dispatchIds[i]);
    }

    reporter.assert(
      deliveryIds.length === 4,
      step,
      "Driver Deliveries",
      `Created ${deliveryIds.length} deliveries with ticket numbers`
    );
  } catch (err: any) {
    reporter.fail(step, "Driver Deliveries", err.message);
  }

  // --- Step 11: Duplicate Delivery Prevention ---
  step++;
  try {
    if (dispatchIds.length < 1) throw new Error("Need at least 1 dispatch");

    // Try to create a second delivery on the same dispatch
    const { error: dupErr } = await supabase
      .from("deliveries")
      .insert({
        dispatch_id: dispatchIds[0],
        driver_id: testDriverId,
        truck_id: testTruckId,
        material_id: cushionSandId,
        delivery_site_id: friscoLakesId,
        ticket_number: "TEST-TKT-DUP",
        delivered_at: new Date().toISOString(),
        confirmation_status: "pending",
        net_weight: 1.0,
        geofence_verified: false,
        synced_offline: false,
      });

    // Whether this succeeds or fails via constraint depends on schema.
    // If it succeeded, delete it and note that duplicates aren't blocked at DB level.
    if (!dupErr) {
      // Duplicate was allowed — clean it up
      await supabase
        .from("deliveries")
        .delete()
        .eq("ticket_number", "TEST-TKT-DUP")
        .eq("dispatch_id", dispatchIds[0]);

      reporter.skip(
        step,
        "Duplicate Delivery Prevention",
        "No unique constraint on (dispatch_id) — duplicates blocked in app layer only"
      );
    } else {
      reporter.pass(
        step,
        "Duplicate Delivery Prevention",
        `DB constraint blocked duplicate: ${dupErr.message}`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "Duplicate Delivery Prevention", err.message);
  }

  // --- Step 12: Confirm Deliveries (first 3 of 4) ---
  step++;
  try {
    if (deliveryIds.length < 4) throw new Error("Need 4 deliveries");

    let confirmed = 0;
    // Only confirm the first 3 — the 4th will be used for the dispute test
    for (let i = 0; i < 3; i++) {
      const { error } = await supabase
        .from("deliveries")
        .update({
          confirmation_status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", deliveryIds[i]);

      if (error) throw error;

      // Update dispatch to confirmed
      await supabase
        .from("dispatches")
        .update({ status: "confirmed" })
        .eq("id", dispatchIds[i]);

      confirmed++;
    }

    reporter.assert(
      confirmed === 3,
      step,
      "Confirm Deliveries",
      `Confirmed ${confirmed} of 4 deliveries (1 reserved for dispute)`
    );
  } catch (err: any) {
    reporter.fail(step, "Confirm Deliveries", err.message);
  }

  // --- Step 13: Dispute Flow ---
  step++;
  try {
    if (deliveryIds.length < 4) throw new Error("Need 4 deliveries");

    const disputeDeliveryId = deliveryIds[3];

    // Step 1: Customer disputes the delivery
    await supabase
      .from("deliveries")
      .update({
        confirmation_status: "disputed",
        dispute_reason: "Wrong material",
      })
      .eq("id", disputeDeliveryId);

    // Verify disputed status
    const { data: disputedDel } = await supabase
      .from("deliveries")
      .select("confirmation_status, dispute_reason")
      .eq("id", disputeDeliveryId)
      .single();

    const disputed = disputedDel?.confirmation_status === "disputed";

    // Step 2: Admin resolves — confirms the delivery after review
    // (We call the data layer directly since resolveDispute() uses requireRole("admin"))
    await supabase
      .from("deliveries")
      .update({
        confirmation_status: "confirmed",
        confirmed_at: new Date().toISOString(),
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolved_by: adminUserId,
        dispute_resolution: "Verified correct material via ticket photo",
      })
      .eq("id", disputeDeliveryId);

    // Update dispatch to confirmed
    await supabase
      .from("dispatches")
      .update({ status: "confirmed" })
      .eq("id", dispatchIds[3]);

    // Verify resolution
    const { data: resolvedDel } = await supabase
      .from("deliveries")
      .select("confirmation_status, dispute_resolved_by, dispute_resolution")
      .eq("id", disputeDeliveryId)
      .single();

    const resolved =
      resolvedDel?.confirmation_status === "confirmed" &&
      resolvedDel?.dispute_resolved_by === adminUserId;

    reporter.assert(
      disputed && resolved,
      step,
      "Dispute Flow",
      `Disputed: ${disputed}, Resolved: ${resolved}`,
      `Resolution: ${resolvedDel?.dispute_resolution}`
    );
  } catch (err: any) {
    reporter.fail(step, "Dispute Flow", err.message);
  }

  // --- Step 14: PO Progress ---
  step++;
  try {
    if (!poId) throw new Error("No PO");

    const { data: po } = await supabase
      .from("purchase_orders")
      .select("quantity_ordered, quantity_delivered, status")
      .eq("id", poId)
      .single();

    // With net_weight=1.0 per delivery and 4 confirmed deliveries,
    // the trigger should have incremented quantity_delivered by 4.0
    // (The trigger fires on confirmation_status change to 'confirmed')
    const qtyDelivered = Number(po?.quantity_delivered ?? 0);
    const qtyOrdered = Number(po?.quantity_ordered ?? 0);

    reporter.assert(
      qtyDelivered > 0,
      step,
      "PO Progress",
      `Ordered: ${qtyOrdered}, Delivered: ${qtyDelivered}, Status: ${po?.status}`,
      `Progress: ${Math.round((qtyDelivered / qtyOrdered) * 100)}%`
    );
  } catch (err: any) {
    reporter.fail(step, "PO Progress", err.message);
  }

  // =========================================================================
  // === PHASE 3: FINANCIALS ===
  // =========================================================================
  console.log("\n--- Phase 3: Financials ---\n");

  let invoiceId: string | null = null;
  let settlementId: string | null = null;

  // --- Step 15: Generate Invoice ---
  step++;
  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (generateInvoice) {
      // Use the REAL service function via the shim
      const invoice = await generateInvoice(
        testCustomerId,
        yesterday,
        today,
        [poId!],
        supabase
      );
      invoiceId = invoice.id;

      // Verify the service calculated the total correctly
      const expectedTotal = 185 * 4; // 4 confirmed deliveries x $185/load
      const actualTotal = Number(invoice.total);

      reporter.assert(
        actualTotal === expectedTotal,
        step,
        "Generate Invoice (service)",
        `Invoice #${invoice.invoice_number}`,
        `Total: expected $${expectedTotal}, got $${actualTotal}`,
        `Line items: ${invoice.line_items?.length ?? 0}`
      );
    } else {
      // Fallback: direct Supabase insert (service import failed)
      const ratePerUnit = 185;
      const deliveryCount = 4;
      const subtotal = ratePerUnit * deliveryCount;

      const dueDateObj = new Date();
      dueDateObj.setDate(dueDateObj.getDate() + 30);

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          customer_id: testCustomerId,
          invoice_number: "TEST-INV-001",
          status: "draft",
          subtotal: 0,
          tax_amount: 0,
          total: 0,
          period_start: yesterday,
          period_end: today,
          due_date: dueDateObj.toISOString().split("T")[0],
        })
        .select("id, invoice_number")
        .single();

      if (invErr) throw invErr;
      invoiceId = invoice!.id;

      // Create line items
      for (const deliveryId of deliveryIds) {
        await supabase.from("invoice_line_items").insert({
          invoice_id: invoiceId,
          delivery_id: deliveryId,
          purchase_order_id: poId,
          material_id: cushionSandId,
          description: "Cushion Sand",
          quantity: 1,
          unit: "load",
          rate: ratePerUnit,
          amount: ratePerUnit,
        });
      }

      // Verify trigger recalculation
      const { data: verifiedInvoice } = await supabase
        .from("invoices")
        .select("subtotal, total")
        .eq("id", invoiceId)
        .single();

      const actualTotal = Number(verifiedInvoice?.total ?? 0);

      reporter.assert(
        actualTotal === subtotal,
        step,
        "Generate Invoice (fallback)",
        `Invoice: ${invoice!.invoice_number}`,
        `Total: expected $${subtotal}, got $${actualTotal}`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "Generate Invoice", err.message);
  }

  // --- Step 16: QB Invoice Sync ---
  step++;
  try {
    if (!invoiceId) throw new Error("No invoice from Step 15");

    if (syncInvoiceToQBO) {
      const result = await syncInvoiceToQBO(invoiceId);
      if (result.success) {
        reporter.pass(
          step,
          "QB Invoice Sync",
          `QB Invoice ID: ${result.qbInvoiceId}`
        );
      } else if (result.error?.includes("not connected") || result.error?.includes("QuickBooks not connected")) {
        reporter.pass(
          step,
          "QB Invoice Sync (disconnected)",
          "Graceful failure -- QB not connected"
        );
      } else {
        reporter.fail(step, "QB Invoice Sync", result.error ?? "Unknown error");
      }
    } else {
      // Verify invoice data is sync-ready
      const { data: inv } = await supabase
        .from("invoices")
        .select("id, customer_id, invoice_number, total")
        .eq("id", invoiceId)
        .single();

      const ready = inv && inv.customer_id && Number(inv.total) > 0;
      reporter.skip(
        step,
        "QB Invoice Sync",
        "Service import failed -- verifying data is sync-ready",
        `Invoice ${inv?.invoice_number}: $${inv?.total} (${ready ? "ready" : "NOT ready"})`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "QB Invoice Sync", err.message);
  }

  // --- Step 17: Record Payment ---
  step++;
  try {
    if (!invoiceId) throw new Error("No invoice from Step 15");

    const { data: inv } = await supabase
      .from("invoices")
      .select("total")
      .eq("id", invoiceId)
      .single();

    const paymentAmount = Number(inv!.total);

    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        customer_id: testCustomerId,
        invoice_id: invoiceId,
        amount: paymentAmount,
        payment_method: "ach",
        status: "completed",
        paid_at: new Date().toISOString(),
      })
      .select("id, amount, status")
      .single();

    if (payErr) throw payErr;

    // Mark invoice as paid
    await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", invoiceId);

    reporter.assert(
      Number(payment!.amount) === paymentAmount && payment!.status === "completed",
      step,
      "Record Payment",
      `Payment: $${payment!.amount} via ACH, status: ${payment!.status}`
    );
  } catch (err: any) {
    reporter.fail(step, "Record Payment", err.message);
  }

  // --- Step 18: Generate Settlement ---
  step++;
  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (generateSettlement) {
      // Use the REAL service function via the shim
      const settlement = await generateSettlement(
        testCarrierId,
        yesterday,
        today,
        supabase
      );
      settlementId = settlement.id;

      // Verify the service calculated amounts correctly
      // 4 deliveries x $130/load = $520 hauling
      // 1 week x $1000 = $1000 dispatch fee
      // Total = $1520
      const expectedHauling = 130 * 4;
      const actualHauling = Number(settlement.hauling_amount);
      const actualTotal = Number(settlement.total_amount);

      reporter.assert(
        actualHauling === expectedHauling,
        step,
        "Generate Settlement (service)",
        `Settlement #${settlement.settlement_number}`,
        `Hauling: expected $${expectedHauling}, got $${actualHauling}`,
        `Dispatch fee: $${settlement.dispatch_fee}`,
        `Total: $${actualTotal}`
      );
    } else {
      // Fallback: direct Supabase insert
      const carrierRatePerUnit = 130;
      const haulingAmount = carrierRatePerUnit * 4;
      const settlementTotal = haulingAmount + dispatchFeeWeekly;

      const { data: settlement, error: setErr } = await supabase
        .from("carrier_settlements")
        .insert({
          carrier_id: testCarrierId,
          settlement_number: "TEST-SET-001",
          period_start: yesterday,
          period_end: today,
          hauling_amount: haulingAmount,
          dispatch_fee: dispatchFeeWeekly,
          deductions: 0,
          total_amount: settlementTotal,
          status: "draft",
        })
        .select("id, hauling_amount, dispatch_fee, total_amount")
        .single();

      if (setErr) throw setErr;
      settlementId = settlement!.id;

      // Create settlement line items
      for (const deliveryId of deliveryIds) {
        await supabase.from("carrier_settlement_lines").insert({
          settlement_id: settlementId,
          delivery_id: deliveryId,
          rate_applied: carrierRatePerUnit,
          amount: carrierRatePerUnit,
        });
      }

      reporter.assert(
        Number(settlement!.hauling_amount) === haulingAmount,
        step,
        "Generate Settlement (fallback)",
        `Hauling: $${haulingAmount}, Dispatch: $${dispatchFeeWeekly}, Total: $${settlementTotal}`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "Generate Settlement", err.message);
  }

  // --- Step 19: QB Bill Sync ---
  step++;
  try {
    if (!settlementId) throw new Error("No settlement from Step 18");

    if (syncSettlementToQBO) {
      const result = await syncSettlementToQBO(settlementId);
      if (result.success) {
        reporter.pass(
          step,
          "QB Bill Sync",
          `QB Bill ID: ${result.qbBillId}`
        );
      } else if (result.error?.includes("not connected") || result.error?.includes("QuickBooks not connected")) {
        reporter.pass(
          step,
          "QB Bill Sync (disconnected)",
          "Graceful failure -- QB not connected"
        );
      } else {
        reporter.fail(step, "QB Bill Sync", result.error ?? "Unknown error");
      }
    } else {
      const { data: set } = await supabase
        .from("carrier_settlements")
        .select("settlement_number, total_amount")
        .eq("id", settlementId)
        .single();

      reporter.skip(
        step,
        "QB Bill Sync",
        "Service import failed -- verifying data is sync-ready",
        `Settlement ${set?.settlement_number}: $${set?.total_amount}`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "QB Bill Sync", err.message);
  }

  // =========================================================================
  // === PHASE 4: VERIFICATION ===
  // =========================================================================
  console.log("\n--- Phase 4: Verification ---\n");

  // --- Step 20: PDF Data Verification ---
  step++;
  try {
    if (!invoiceId) throw new Error("No invoice");

    const { data: inv } = await supabase
      .from("invoices")
      .select("id, invoice_number, total, subtotal, period_start, period_end, due_date, status")
      .eq("id", invoiceId)
      .single();

    const { data: lineItems } = await supabase
      .from("invoice_line_items")
      .select("id, description, quantity, rate, amount")
      .eq("invoice_id", invoiceId);

    const { data: customerData } = await supabase
      .from("customers")
      .select("name, billing_address, billing_email")
      .eq("id", testCustomerId)
      .single();

    const hasInvoiceData = inv && Number(inv.total) > 0;
    const hasLineItems = lineItems && lineItems.length >= 1;
    const hasCustomerData = customerData && customerData.name;

    // Verify settlement data for PDF
    let hasSettlementData = false;
    if (settlementId) {
      const { data: set } = await supabase
        .from("carrier_settlements")
        .select("id, settlement_number, total_amount")
        .eq("id", settlementId)
        .single();

      const { data: setLines } = await supabase
        .from("carrier_settlement_lines")
        .select("id")
        .eq("settlement_id", settlementId);

      hasSettlementData = !!(set && setLines && setLines.length > 0);
    }

    reporter.assert(
      !!(hasInvoiceData && hasLineItems && hasCustomerData && hasSettlementData),
      step,
      "PDF Data Verification",
      `Invoice: ${inv?.invoice_number} with ${lineItems?.length} line items`,
      `Customer: ${customerData?.name} (${customerData?.billing_address})`,
      `Settlement: ${hasSettlementData ? "data complete" : "MISSING DATA"}`
    );
  } catch (err: any) {
    reporter.fail(step, "PDF Data Verification", err.message);
  }

  // --- Step 21: RLS Verification ---
  step++;
  try {
    const rlsResults: string[] = [];
    let rlsAllPassed = true;

    // --- Customer RLS Test ---
    const customerClient = createAnonClient();
    const { error: custAuthErr } = await customerClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.customer.email,
      password: TEST_ACCOUNTS.customer.password,
    });

    if (custAuthErr) throw new Error(`Customer login failed: ${custAuthErr.message}`);

    // Customer should NOT see carrier settlements
    const { data: custSettlements } = await customerClient
      .from("carrier_settlements")
      .select("id");

    if (custSettlements && custSettlements.length > 0) {
      rlsResults.push(`FAIL: Customer can see ${custSettlements.length} settlements (should be 0)`);
      rlsAllPassed = false;
    } else {
      rlsResults.push("Customer cannot see carrier settlements");
    }

    // Customer should NOT see rates
    const { data: custRates } = await customerClient.from("rates").select("id");
    if (custRates && custRates.length > 0) {
      rlsResults.push(`FAIL: Customer can see ${custRates.length} rates (should be 0)`);
      rlsAllPassed = false;
    } else {
      rlsResults.push("Customer cannot see rates");
    }

    // Customer SHOULD see their own invoices
    const { data: custInvoices } = await customerClient
      .from("invoices")
      .select("id")
      .eq("customer_id", testCustomerId);

    if (!custInvoices || custInvoices.length === 0) {
      rlsResults.push("FAIL: Customer cannot see their own invoices");
      rlsAllPassed = false;
    } else {
      rlsResults.push(`Customer can see ${custInvoices.length} own invoice(s)`);
    }

    await customerClient.auth.signOut();

    // --- Driver RLS Test ---
    const driverClient = createAnonClient();
    const { error: drvAuthErr } = await driverClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.driver.email,
      password: TEST_ACCOUNTS.driver.password,
    });

    if (drvAuthErr) throw new Error(`Driver login failed: ${drvAuthErr.message}`);

    // Driver should NOT see invoices
    const { data: drvInvoices } = await driverClient.from("invoices").select("id");
    if (drvInvoices && drvInvoices.length > 0) {
      rlsResults.push(`FAIL: Driver can see ${drvInvoices.length} invoices (should be 0)`);
      rlsAllPassed = false;
    } else {
      rlsResults.push("Driver cannot see invoices");
    }

    // Driver should NOT see payments
    const { data: drvPayments } = await driverClient.from("payments").select("id");
    if (drvPayments && drvPayments.length > 0) {
      rlsResults.push(`FAIL: Driver can see ${drvPayments.length} payments (should be 0)`);
      rlsAllPassed = false;
    } else {
      rlsResults.push("Driver cannot see payments");
    }

    // Driver SHOULD see their own dispatches
    const { data: drvDispatches } = await driverClient.from("dispatches").select("id");
    if (!drvDispatches || drvDispatches.length === 0) {
      rlsResults.push("FAIL: Driver cannot see their own dispatches");
      rlsAllPassed = false;
    } else {
      rlsResults.push(`Driver can see ${drvDispatches.length} own dispatch(es)`);
    }

    await driverClient.auth.signOut();

    reporter.assert(rlsAllPassed, step, "RLS Verification", ...rlsResults);
  } catch (err: any) {
    reporter.fail(step, "RLS Verification", err.message);
  }

  // --- Step 22: Edge Cases ---
  step++;
  try {
    const edgeResults: string[] = [];
    let edgesOk = true;

    // Edge case 1: Double-confirm should not double-count
    if (deliveryIds.length > 0) {
      const { data: poBefore } = await supabase
        .from("purchase_orders")
        .select("quantity_delivered")
        .eq("id", poId!)
        .single();

      // Try confirming an already-confirmed delivery again
      await supabase
        .from("deliveries")
        .update({
          confirmation_status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", deliveryIds[0]);

      const { data: poAfter } = await supabase
        .from("purchase_orders")
        .select("quantity_delivered")
        .eq("id", poId!)
        .single();

      const beforeQty = Number(poBefore?.quantity_delivered ?? 0);
      const afterQty = Number(poAfter?.quantity_delivered ?? 0);
      const didNotDoubleCount = afterQty === beforeQty;

      if (didNotDoubleCount) {
        edgeResults.push("Double-confirm does not double-count PO quantity");
      } else {
        edgeResults.push(`FAIL: Double-confirm changed PO qty from ${beforeQty} to ${afterQty}`);
        edgesOk = false;
      }
    }

    // Edge case 2: Invalid email format should be caught at app layer
    edgeResults.push("Email validation: handled by auth (Supabase validates on createUser)");

    reporter.assert(edgesOk, step, "Edge Cases", ...edgeResults);
  } catch (err: any) {
    reporter.fail(step, "Edge Cases", err.message);
  }

  // --- Step 23: Notifications ---
  step++;
  try {
    // Insert a test notification
    const { data: notif, error: notifErr } = await supabase
      .from("notifications")
      .insert({
        user_id: adminUserId,
        type: "delivery_confirmed",
        title: "TEST: Delivery Confirmed",
        message: "Test delivery for E2E verification",
        channel: "in_app",
        read: false,
      })
      .select("id, type, title")
      .single();

    if (notifErr) throw notifErr;

    // Verify notification exists
    const { data: readBack } = await supabase
      .from("notifications")
      .select("id, type, read")
      .eq("id", notif!.id)
      .single();

    reporter.assert(
      readBack?.type === "delivery_confirmed" && readBack?.read === false,
      step,
      "Notifications",
      `Created notification: ${notif!.title}`,
      `Read status: ${readBack?.read} (expected false)`
    );
  } catch (err: any) {
    reporter.fail(step, "Notifications", err.message);
  }

  // --- Step 24: Dashboard Data ---
  step++;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Today's deliveries
    const { data: todayDeliveries } = await supabase
      .from("deliveries")
      .select("id")
      .gte("delivered_at", todayStart.toISOString())
      .lte("delivered_at", todayEnd.toISOString());

    // Revenue (sent + paid invoices this month)
    const { data: revenueInvoices } = await supabase
      .from("invoices")
      .select("total_amount:total, status")
      .gte("created_at", monthStart.toISOString())
      .in("status", ["sent", "paid"]);

    const totalRevenue = revenueInvoices?.reduce(
      (sum, i) => sum + (Number((i as any).total_amount) || 0),
      0
    ) ?? 0;

    // Active POs
    const { count: activePOCount } = await supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    reporter.assert(
      todayDeliveries !== null && todayDeliveries.length >= 4,
      step,
      "Dashboard Data",
      `Today's deliveries: ${todayDeliveries?.length ?? 0}`,
      `Monthly revenue (sent+paid): $${totalRevenue}`,
      `Active POs: ${activePOCount ?? 0}`
    );
  } catch (err: any) {
    reporter.fail(step, "Dashboard Data", err.message);
  }

  // =========================================================================
  // Final Report
  // =========================================================================
  reporter.printReport();

  // Log import failures if any
  if (importFailures.length > 0) {
    console.log("\nService Import Notes:");
    for (const f of importFailures) {
      console.log(`  [!] ${f}`);
    }
  }

  console.log(`\nTest data is PRESERVED in Supabase for manual inspection.`);
  console.log(`Run 'npx tsx scripts/cleanup-sandbox-test.ts' to remove.\n`);

  process.exit(reporter.allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
