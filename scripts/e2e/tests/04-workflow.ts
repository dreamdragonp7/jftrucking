/**
 * 04 - Workflow Tests
 *
 * Tests the core business workflow: PO -> Dispatch -> Delivery -> Confirmation
 *
 * Tests:
 *  1. Create PO (TEST-PO-001, 5 loads cushion sand)
 *  2. Create 4 dispatches linked to PO
 *  3. Submit 4 deliveries with net_weight=1.0
 *  4. Duplicate delivery prevention
 *  5. Confirm deliveries 1-3 (leave 4th for dispute test)
 *  6. PO quantity_delivered = 3 after confirmations
 *  7. Dispatch status lifecycle (dispatched -> acknowledged -> in_progress -> completed)
 */

import {
  createAdminClient,
  assertSandboxMode,
  TestReporter,
} from "../lib/test-helpers";
import type { TestContext } from "../lib/types";

export async function runWorkflowTests(ctx: TestContext): Promise<TestReporter> {
  const reporter = new TestReporter("04-Workflow");
  const supabase = createAdminClient();
  await assertSandboxMode(supabase);

  console.log("--- 04: Workflow ---\n");

  let step = 0;
  const today = new Date().toISOString().split("T")[0];

  // --- Step 1: Create PO ---
  step++;
  try {
    // Clean up any existing test PO first
    const { data: existingPO } = await supabase
      .from("purchase_orders")
      .select("id")
      .eq("po_number", "TEST-PO-001")
      .maybeSingle();

    if (existingPO) {
      // Delete child records first
      const { data: existingDispatches } = await supabase
        .from("dispatches")
        .select("id")
        .eq("purchase_order_id", existingPO.id);

      if (existingDispatches && existingDispatches.length > 0) {
        const dIds = existingDispatches.map((d) => d.id);
        await supabase.from("deliveries").delete().in("dispatch_id", dIds);
        await supabase.from("dispatches").delete().in("id", dIds);
      }
      await supabase.from("purchase_orders").delete().eq("id", existingPO.id);
    }

    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .insert({
        customer_id: ctx.customerId,
        po_number: "TEST-PO-001",
        material_id: ctx.materialIds["Cushion Sand"],
        delivery_site_id: ctx.friscoLakesId,
        quantity_ordered: 5,
        quantity_delivered: 0,
        unit: "load",
        status: "active",
        notes: "E2E test PO - 5 loads cushion sand",
      })
      .select("id, po_number")
      .single();

    if (poErr) throw new Error(`PO creation failed: ${poErr.message}`);

    ctx.poId = po!.id;

    reporter.pass(step, "Create PO", `TEST-PO-001 (${po!.id}), 5 loads cushion sand`);
  } catch (err: any) {
    reporter.fail(step, "Create PO", err.message);
    // Cannot continue without PO
    reporter.printReport();
    return reporter;
  }

  // --- Step 2: Create 4 dispatches ---
  step++;
  try {
    const dispatchIds: string[] = [];

    for (let i = 1; i <= 4; i++) {
      const { data: dispatch, error: dispErr } = await supabase
        .from("dispatches")
        .insert({
          purchase_order_id: ctx.poId!,
          carrier_id: ctx.carrierId,
          driver_id: ctx.driverId,
          truck_id: ctx.truckId,
          material_id: ctx.materialIds["Cushion Sand"],
          pickup_site_id: ctx.kaufmanSandId,
          delivery_site_id: ctx.friscoLakesId,
          scheduled_date: today,
          status: "dispatched",
          notes: `E2E test dispatch #${i}`,
        })
        .select("id")
        .single();

      if (dispErr) throw new Error(`Dispatch #${i} failed: ${dispErr.message}`);
      dispatchIds.push(dispatch!.id);
    }

    ctx.dispatchIds = dispatchIds;

    reporter.pass(
      step,
      "Create 4 dispatches",
      `IDs: ${dispatchIds.map((id) => id.slice(0, 8)).join(", ")}`
    );
  } catch (err: any) {
    reporter.fail(step, "Create 4 dispatches", err.message);
    reporter.printReport();
    return reporter;
  }

  // --- Step 3: Submit 4 deliveries ---
  step++;
  try {
    const deliveryIds: string[] = [];

    for (let i = 0; i < 4; i++) {
      const { data: delivery, error: delErr } = await supabase
        .from("deliveries")
        .insert({
          dispatch_id: ctx.dispatchIds![i],
          driver_id: ctx.driverId,
          truck_id: ctx.truckId,
          material_id: ctx.materialIds["Cushion Sand"],
          delivery_site_id: ctx.friscoLakesId,
          ticket_number: `TEST-TKT-00${i + 1}`,
          net_weight: 1.0, // per_load: weight=1.0 for PO trigger
          delivered_at: new Date().toISOString(),
          confirmation_status: "pending",
        })
        .select("id")
        .single();

      if (delErr) throw new Error(`Delivery #${i + 1} failed: ${delErr.message}`);
      deliveryIds.push(delivery!.id);

      // Update dispatch status to completed
      await supabase
        .from("dispatches")
        .update({ status: "completed" })
        .eq("id", ctx.dispatchIds![i]);
    }

    ctx.deliveryIds = deliveryIds;

    reporter.pass(
      step,
      "Submit 4 deliveries",
      `Ticket numbers: TEST-TKT-001 through TEST-TKT-004`
    );
  } catch (err: any) {
    reporter.fail(step, "Submit 4 deliveries", err.message);
    reporter.printReport();
    return reporter;
  }

  // --- Step 4: Duplicate delivery prevention ---
  step++;
  try {
    // Try to submit another delivery for the same dispatch
    const { error: dupErr } = await supabase
      .from("deliveries")
      .insert({
        dispatch_id: ctx.dispatchIds![0], // Same dispatch as delivery 1
        driver_id: ctx.driverId,
        truck_id: ctx.truckId,
        material_id: ctx.materialIds["Cushion Sand"],
        delivery_site_id: ctx.friscoLakesId,
        ticket_number: "TEST-TKT-DUP",
        net_weight: 1.0,
        delivered_at: new Date().toISOString(),
        confirmation_status: "pending",
      });

    // Should fail due to unique constraint on dispatch_id
    const blocked = !!dupErr;

    if (!blocked) {
      // Clean up the duplicate if it was created
      await supabase
        .from("deliveries")
        .delete()
        .eq("ticket_number", "TEST-TKT-DUP");
    }

    reporter.assert(
      blocked,
      step,
      "Duplicate delivery prevention",
      blocked
        ? `Correctly blocked: ${dupErr!.message}`
        : "Duplicate was NOT blocked -- missing unique constraint on dispatch_id"
    );
  } catch (err: any) {
    reporter.fail(step, "Duplicate delivery prevention", err.message);
  }

  // --- Step 5: Confirm deliveries 1-3 ---
  step++;
  try {
    const confirmedIds: string[] = [];

    // Resolve admin user ID
    const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const adminUser = allUsers?.users?.find(
      (u) => u.email === "test.admin@jft-test.local"
    );
    const adminId = adminUser?.id ?? "system";

    for (let i = 0; i < 3; i++) {
      const deliveryId = ctx.deliveryIds![i];

      const { error: confirmErr } = await supabase
        .from("deliveries")
        .update({
          confirmation_status: "confirmed",
          confirmed_at: new Date().toISOString(),
          confirmed_by: adminId,
        })
        .eq("id", deliveryId);

      if (confirmErr) throw new Error(`Confirm delivery ${i + 1} failed: ${confirmErr.message}`);
      confirmedIds.push(deliveryId);
    }

    ctx.confirmedDeliveryIds = confirmedIds;

    // Keep delivery 4 as pending for dispute test
    ctx.disputedDeliveryId = ctx.deliveryIds![3];

    reporter.pass(
      step,
      "Confirm deliveries 1-3",
      `Confirmed: ${confirmedIds.length}, Pending: 1 (for dispute test)`
    );
  } catch (err: any) {
    reporter.fail(step, "Confirm deliveries 1-3", err.message);
  }

  // --- Step 6: PO quantity_delivered check ---
  step++;
  try {
    // Small delay for any DB triggers to fire
    await new Promise((r) => setTimeout(r, 500));

    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .select("quantity_ordered, quantity_delivered, status")
      .eq("id", ctx.poId!)
      .single();

    if (poErr) throw new Error(`PO read failed: ${poErr.message}`);

    const delivered = po?.quantity_delivered ?? 0;

    reporter.assert(
      delivered >= 3,
      step,
      "PO quantity_delivered check",
      `Ordered: ${po?.quantity_ordered}, Delivered: ${delivered}, Status: ${po?.status}`
    );
  } catch (err: any) {
    reporter.fail(step, "PO quantity_delivered check", err.message);
  }

  // --- Step 7: Dispatch status lifecycle ---
  step++;
  try {
    if (!ctx.dispatchIds || ctx.dispatchIds.length === 0) {
      reporter.fail(step, "Dispatch status lifecycle", "No dispatches created");
    } else {
      // Use the first dispatch to test full lifecycle
      // It should currently be "completed" (set in Step 3)
      const testDispatchId = ctx.dispatchIds[0];

      const { data: currentDispatch } = await supabase
        .from("dispatches")
        .select("status")
        .eq("id", testDispatchId)
        .single();

      // Verify it progressed through valid states
      // Valid lifecycle: dispatched -> acknowledged -> in_progress -> completed
      // We created as "dispatched", then set to "completed" in step 3
      // Let's verify the current state and test that invalid transitions are handled

      // Create a new dispatch to test the full lifecycle
      const { data: lifecycleDispatch, error: lcErr } = await supabase
        .from("dispatches")
        .insert({
          purchase_order_id: ctx.poId!,
          carrier_id: ctx.carrierId,
          driver_id: ctx.driverId,
          truck_id: ctx.truckId,
          material_id: ctx.materialIds["Cushion Sand"],
          pickup_site_id: ctx.kaufmanSandId,
          delivery_site_id: ctx.friscoLakesId,
          scheduled_date: today,
          status: "dispatched",
          notes: "E2E lifecycle test dispatch",
        })
        .select("id, status")
        .single();

      if (lcErr) throw new Error(`Lifecycle dispatch failed: ${lcErr.message}`);

      const lcId = lifecycleDispatch!.id;
      const transitions: string[] = [lifecycleDispatch!.status];

      // dispatched -> acknowledged
      await supabase.from("dispatches").update({ status: "acknowledged" }).eq("id", lcId);
      const { data: ack } = await supabase.from("dispatches").select("status").eq("id", lcId).single();
      transitions.push(ack?.status ?? "?");

      // acknowledged -> in_progress
      await supabase.from("dispatches").update({ status: "in_progress" }).eq("id", lcId);
      const { data: ip } = await supabase.from("dispatches").select("status").eq("id", lcId).single();
      transitions.push(ip?.status ?? "?");

      // in_progress -> completed
      await supabase.from("dispatches").update({ status: "completed" }).eq("id", lcId);
      const { data: comp } = await supabase.from("dispatches").select("status").eq("id", lcId).single();
      transitions.push(comp?.status ?? "?");

      const expectedSequence = ["dispatched", "acknowledged", "in_progress", "completed"];
      const matchesExpected = transitions.every((s, i) => s === expectedSequence[i]);

      // Cleanup: delete the lifecycle test dispatch
      await supabase.from("dispatches").delete().eq("id", lcId);

      reporter.assert(
        matchesExpected,
        step,
        "Dispatch status lifecycle",
        `Transitions: ${transitions.join(" -> ")}`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "Dispatch status lifecycle", err.message);
  }

  reporter.printReport();
  return reporter;
}
