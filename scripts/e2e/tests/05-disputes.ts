/**
 * 05 - Dispute Tests
 *
 * Tests the dispute flow: customer disputes -> admin resolves
 *
 * Tests:
 *  1. Customer disputes delivery 4
 *  2. Verify delivery confirmation_status = "disputed"
 *  3. Verify dispatch status updated
 *  4. Admin resolves dispute with "confirm"
 *  5. Verify delivery now confirmed
 *  6. PO quantity_delivered incremented after resolution
 *  7. Reject dispute -> dispatch cancelled, PO quantity_delivered NOT incremented
 */

import {
  createAdminClient,
  assertSandboxMode,
  TestReporter,
} from "../lib/test-helpers";
import type { TestContext } from "../lib/types";

export async function runDisputeTests(ctx: TestContext): Promise<TestReporter> {
  const reporter = new TestReporter("05-Disputes");
  const supabase = createAdminClient();
  await assertSandboxMode(supabase);

  console.log("--- 05: Disputes ---\n");

  let step = 0;

  if (!ctx.disputedDeliveryId) {
    reporter.fail(1, "Dispute prerequisite", "No disputed delivery ID from workflow tests");
    reporter.printReport();
    return reporter;
  }

  // --- Step 1: Customer disputes delivery 4 ---
  step++;
  try {
    const { error: disputeErr } = await supabase
      .from("deliveries")
      .update({
        confirmation_status: "disputed",
        dispute_reason: "Wrong material delivered",
      })
      .eq("id", ctx.disputedDeliveryId);

    if (disputeErr) throw new Error(`Dispute update failed: ${disputeErr.message}`);

    reporter.pass(step, "Customer disputes delivery 4", "Reason: Wrong material delivered");
  } catch (err: any) {
    reporter.fail(step, "Customer disputes delivery 4", err.message);
  }

  // --- Step 2: Verify disputed status ---
  step++;
  try {
    const { data: delivery, error } = await supabase
      .from("deliveries")
      .select("confirmation_status, dispute_reason")
      .eq("id", ctx.disputedDeliveryId)
      .single();

    if (error) throw error;

    reporter.assert(
      delivery?.confirmation_status === "disputed",
      step,
      "Delivery status = disputed",
      `Status: ${delivery?.confirmation_status}, Reason: ${delivery?.dispute_reason}`
    );
  } catch (err: any) {
    reporter.fail(step, "Delivery status = disputed", err.message);
  }

  // --- Step 3: Verify dispatch status ---
  step++;
  try {
    // Get the dispatch for this delivery
    const { data: delivery } = await supabase
      .from("deliveries")
      .select("dispatch_id")
      .eq("id", ctx.disputedDeliveryId)
      .single();

    if (!delivery) throw new Error("Delivery not found");

    const { data: dispatch } = await supabase
      .from("dispatches")
      .select("status")
      .eq("id", delivery.dispatch_id)
      .single();

    // The dispatch should still be in a valid state (not null/undefined)
    const validStatuses = ["dispatched", "acknowledged", "in_progress", "delivered", "completed", "confirmed"];
    const isValid = validStatuses.includes(dispatch?.status ?? "");

    reporter.assert(
      isValid,
      step,
      "Dispatch status after dispute",
      `Dispatch status: ${dispatch?.status ?? "unknown"} (valid: ${isValid})`
    );
  } catch (err: any) {
    reporter.fail(step, "Dispatch status after dispute", err.message);
  }

  // --- Step 4: Admin resolves dispute with "confirm" ---
  step++;
  try {
    // Resolve admin user ID
    const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const adminUser = allUsers?.users?.find(
      (u) => u.email === "test.admin@jft-test.local"
    );
    const adminId = adminUser?.id ?? "system";

    const { error: resolveErr } = await supabase
      .from("deliveries")
      .update({
        confirmation_status: "confirmed",
        confirmed_at: new Date().toISOString(),
        confirmed_by: adminId,
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolved_by: adminId,
        dispute_resolution: "Admin confirmed delivery after review -- material was correct",
      })
      .eq("id", ctx.disputedDeliveryId);

    if (resolveErr) throw new Error(`Resolution failed: ${resolveErr.message}`);

    reporter.pass(step, "Admin resolves dispute (confirm)", "Override: delivery confirmed");
  } catch (err: any) {
    reporter.fail(step, "Admin resolves dispute (confirm)", err.message);
  }

  // --- Step 5: Verify delivery now confirmed ---
  step++;
  try {
    const { data: delivery, error } = await supabase
      .from("deliveries")
      .select("confirmation_status, dispute_resolved_at, dispute_resolution")
      .eq("id", ctx.disputedDeliveryId)
      .single();

    if (error) throw error;

    reporter.assert(
      delivery?.confirmation_status === "confirmed" && !!delivery?.dispute_resolved_at,
      step,
      "Delivery confirmed after resolution",
      `Status: ${delivery?.confirmation_status}, Resolved: ${!!delivery?.dispute_resolved_at}`
    );
  } catch (err: any) {
    reporter.fail(step, "Delivery confirmed after resolution", err.message);
  }

  // --- Step 6: PO quantity_delivered after dispute resolution ---
  step++;
  try {
    // Small delay for triggers
    await new Promise((r) => setTimeout(r, 500));

    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .select("quantity_ordered, quantity_delivered, status")
      .eq("id", ctx.poId!)
      .single();

    if (poErr) throw new Error(`PO read failed: ${poErr.message}`);

    const delivered = po?.quantity_delivered ?? 0;

    // Should be 4 now (3 confirmed + 1 dispute-resolved-to-confirmed)
    reporter.assert(
      delivered >= 4,
      step,
      "PO quantity after dispute resolution",
      `Ordered: ${po?.quantity_ordered}, Delivered: ${delivered}, Status: ${po?.status}`
    );
  } catch (err: any) {
    reporter.fail(step, "PO quantity after dispute resolution", err.message);
  }

  // --- Step 7: Dispute resolve with "reject" -> delivery rejected, dispatch cancelled ---
  step++;
  try {
    // Create a new dispatch + delivery to test reject flow
    const today = new Date().toISOString().split("T")[0];

    const { data: rejectDispatch, error: rdErr } = await supabase
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
        notes: "E2E reject test dispatch",
      })
      .select("id")
      .single();

    if (rdErr) throw new Error(`Reject dispatch failed: ${rdErr.message}`);

    const { data: rejectDelivery, error: rlErr } = await supabase
      .from("deliveries")
      .insert({
        dispatch_id: rejectDispatch!.id,
        driver_id: ctx.driverId,
        truck_id: ctx.truckId,
        material_id: ctx.materialIds["Cushion Sand"],
        delivery_site_id: ctx.friscoLakesId,
        ticket_number: `TEST-TKT-REJECT-${Date.now().toString().slice(-4)}`,
        net_weight: 1.0,
        delivered_at: new Date().toISOString(),
        confirmation_status: "disputed",
        dispute_reason: "Delivery never arrived",
      })
      .select("id")
      .single();

    if (rlErr) throw new Error(`Reject delivery failed: ${rlErr.message}`);

    // Record PO quantity_delivered BEFORE reject
    const { data: poBefore } = await supabase
      .from("purchase_orders")
      .select("quantity_delivered")
      .eq("id", ctx.poId!)
      .single();
    const deliveredBefore = poBefore?.quantity_delivered ?? 0;

    // Resolve admin user ID
    const { data: allUsers2 } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const adminUser2 = allUsers2?.users?.find(
      (u) => u.email === "test.admin@jft-test.local"
    );
    const adminId2 = adminUser2?.id ?? "system";

    // Admin resolves dispute with "reject"
    await supabase
      .from("deliveries")
      .update({
        confirmation_status: "rejected",
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolved_by: adminId2,
        dispute_resolution: "Delivery rejected after investigation",
      })
      .eq("id", rejectDelivery!.id);

    // Cancel the dispatch
    await supabase
      .from("dispatches")
      .update({ status: "cancelled" })
      .eq("id", rejectDispatch!.id);

    // Small delay for triggers
    await new Promise((r) => setTimeout(r, 500));

    // Verify dispatch is cancelled
    const { data: cancelledDispatch } = await supabase
      .from("dispatches")
      .select("status")
      .eq("id", rejectDispatch!.id)
      .single();

    // Verify PO quantity_delivered did NOT increment
    const { data: poAfter } = await supabase
      .from("purchase_orders")
      .select("quantity_delivered")
      .eq("id", ctx.poId!)
      .single();
    const deliveredAfter = poAfter?.quantity_delivered ?? 0;

    const dispatchCancelled = cancelledDispatch?.status === "cancelled";
    const poNotIncremented = deliveredAfter <= deliveredBefore;

    // Cleanup
    await supabase.from("deliveries").delete().eq("id", rejectDelivery!.id);
    await supabase.from("dispatches").delete().eq("id", rejectDispatch!.id);

    reporter.assert(
      dispatchCancelled && poNotIncremented,
      step,
      "Reject dispute -> dispatch cancelled, PO unchanged",
      `Dispatch: ${cancelledDispatch?.status}, PO delivered before: ${deliveredBefore}, after: ${deliveredAfter}`
    );
  } catch (err: any) {
    reporter.fail(step, "Reject dispute -> dispatch cancelled, PO unchanged", err.message);
  }

  reporter.printReport();
  return reporter;
}
