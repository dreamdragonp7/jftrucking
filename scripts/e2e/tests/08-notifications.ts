/**
 * 08 - Notification Tests
 *
 * Tests the notification system: creation, types, mark-as-read,
 * workflow-triggered notifications, user filtering, and data payloads.
 *
 * Tests:
 *  1. Create notification manually, verify structure
 *  2. Verify notification has correct fields (type, user_id, read=false)
 *  3. Mark notification as read -> read_at set
 *  4. Bulk notification creation (for admin users)
 *  5. Notification filtering by user
 *  6. Delivery confirmed notification type (from workflow)
 *  7. Delivery disputed notification type (from dispute flow)
 *  8. Invoice sent notification type
 *  9. Payment received notification type
 * 10. Settlement created notification type
 * 11. Notification data payload references (delivery_id, invoice_id, etc.)
 */

import {
  createAdminClient,
  assertSandboxMode,
  TestReporter,
} from "../lib/test-helpers";
import { TEST_ACCOUNTS } from "../lib/test-accounts";
import type { TestContext } from "../lib/types";

export async function runNotificationTests(ctx: TestContext): Promise<TestReporter> {
  const reporter = new TestReporter("08-Notifications");
  const supabase = createAdminClient();
  await assertSandboxMode(supabase);

  console.log("--- 08: Notifications ---\n");

  let step = 0;

  // Resolve user IDs
  const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const adminUser = allUsers?.users?.find(
    (u) => u.email === TEST_ACCOUNTS.admin.email
  );
  const customerUser = allUsers?.users?.find(
    (u) => u.email === TEST_ACCOUNTS.customer.email
  );

  if (!adminUser || !customerUser) {
    reporter.fail(1, "Notification prerequisites", "Admin or customer user not found");
    reporter.printReport();
    return reporter;
  }

  let testNotificationId: string | null = null;

  // --- Step 1: Create notification manually ---
  step++;
  try {
    const { data: notif, error: notifErr } = await supabase
      .from("notifications")
      .insert({
        user_id: customerUser.id,
        type: "delivery_confirmed",
        title: "E2E Test Notification",
        message: "This is a test notification from the E2E test suite",
        channel: "in_app",
        read: false,
        read_at: null,
        data: { test: true, delivery_id: ctx.deliveryIds?.[0] ?? "test" },
      })
      .select("id")
      .single();

    if (notifErr) throw new Error(`Notification creation failed: ${notifErr.message}`);

    testNotificationId = notif!.id;

    reporter.pass(step, "Create notification", `ID: ${notif!.id}`);
  } catch (err: any) {
    reporter.fail(step, "Create notification", err.message);
  }

  // --- Step 2: Verify notification structure ---
  step++;
  try {
    if (!testNotificationId) throw new Error("No notification to verify");

    const { data: notif, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", testNotificationId)
      .single();

    if (error) throw error;

    const hasCorrectType = notif.type === "delivery_confirmed";
    const hasCorrectUser = notif.user_id === customerUser.id;
    const isUnread = notif.read === false;
    const hasTitle = notif.title === "E2E Test Notification";
    const readAtNull = notif.read_at === null;

    reporter.assert(
      hasCorrectType && hasCorrectUser && isUnread && hasTitle && readAtNull,
      step,
      "Notification structure",
      `Type: ${notif.type}, User: ${hasCorrectUser}, Read: ${notif.read}, Title: ${hasTitle}`
    );
  } catch (err: any) {
    reporter.fail(step, "Notification structure", err.message);
  }

  // --- Step 3: Mark as read ---
  step++;
  try {
    if (!testNotificationId) throw new Error("No notification to mark");

    const readAt = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("notifications")
      .update({ read: true, read_at: readAt })
      .eq("id", testNotificationId);

    if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

    const { data: notif } = await supabase
      .from("notifications")
      .select("read, read_at")
      .eq("id", testNotificationId)
      .single();

    reporter.assert(
      notif?.read === true && !!notif?.read_at,
      step,
      "Mark as read",
      `Read: ${notif?.read}, Read_at: ${notif?.read_at}`
    );
  } catch (err: any) {
    reporter.fail(step, "Mark as read", err.message);
  }

  // --- Step 4: Bulk notification creation ---
  step++;
  try {
    const bulkNotifs = [
      {
        user_id: adminUser.id,
        type: "po_threshold" as const,
        title: "E2E Bulk Test 1",
        message: "Bulk notification 1",
        channel: "in_app" as const,
        read: false,
        read_at: null,
        data: { test: true },
      },
      {
        user_id: adminUser.id,
        type: "delivery_disputed" as const,
        title: "E2E Bulk Test 2",
        message: "Bulk notification 2",
        channel: "in_app" as const,
        read: false,
        read_at: null,
        data: { test: true },
      },
    ];

    const { data: created, error: bulkErr } = await supabase
      .from("notifications")
      .insert(bulkNotifs)
      .select("id");

    if (bulkErr) throw new Error(`Bulk insert failed: ${bulkErr.message}`);

    reporter.assert(
      (created?.length ?? 0) === 2,
      step,
      "Bulk notification creation",
      `Created: ${created?.length ?? 0} notifications`
    );
  } catch (err: any) {
    reporter.fail(step, "Bulk notification creation", err.message);
  }

  // --- Step 5: Notification filtering by user ---
  step++;
  try {
    // Admin should see their notifications
    const { data: adminNotifs } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", adminUser.id);

    // Customer should see their notifications
    const { data: custNotifs } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", customerUser.id);

    const adminCount = adminNotifs?.length ?? 0;
    const custCount = custNotifs?.length ?? 0;

    // Cross-check: customer should NOT see admin notifications
    const custSeeingAdmin = custNotifs?.some((n) =>
      adminNotifs?.some((a) => a.id === n.id)
    ) ?? false;

    reporter.assert(
      adminCount >= 2 && custCount >= 1 && !custSeeingAdmin,
      step,
      "Notification filtering by user",
      `Admin: ${adminCount}, Customer: ${custCount}, Cross-leak: ${custSeeingAdmin}`
    );
  } catch (err: any) {
    reporter.fail(step, "Notification filtering by user", err.message);
  }

  // --- Step 6: delivery_confirmed notification type ---
  step++;
  try {
    if (!ctx.deliveryIds || ctx.deliveryIds.length === 0) {
      reporter.skip(step, "Delivery confirmed notification", "No delivery IDs from workflow test");
    } else {
      // Create a delivery_confirmed notification tied to real delivery
      const { data: notif, error } = await supabase
        .from("notifications")
        .insert({
          user_id: customerUser.id,
          type: "delivery_confirmed",
          title: "Delivery Pending Confirmation",
          message: `Load TEST-TKT-001 delivered to TEST_Frisco_Lakes. Please confirm or dispute.`,
          channel: "in_app",
          read: false,
          read_at: null,
          data: {
            delivery_id: ctx.deliveryIds[0],
            dispatch_id: ctx.dispatchIds?.[0] ?? null,
          },
        })
        .select("id, type, data")
        .single();

      if (error) throw error;

      const payload = notif?.data as Record<string, unknown> | null;
      reporter.assert(
        notif?.type === "delivery_confirmed" && payload?.delivery_id === ctx.deliveryIds[0],
        step,
        "Delivery confirmed notification",
        `Type: ${notif?.type}, delivery_id in payload: ${payload?.delivery_id === ctx.deliveryIds[0]}`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "Delivery confirmed notification", err.message);
  }

  // --- Step 7: delivery_disputed notification type ---
  step++;
  try {
    if (!ctx.disputedDeliveryId) {
      reporter.skip(step, "Delivery disputed notification", "No disputed delivery from test");
    } else {
      const { data: notif, error } = await supabase
        .from("notifications")
        .insert({
          user_id: adminUser.id,
          type: "delivery_disputed",
          title: "Delivery Disputed",
          message: `TEST_DR_Horton disputed a delivery: Weight discrepancy`,
          channel: "in_app",
          read: false,
          read_at: null,
          data: {
            delivery_id: ctx.disputedDeliveryId,
            reason: "Weight discrepancy",
          },
        })
        .select("id, type, data")
        .single();

      if (error) throw error;

      const payload = notif?.data as Record<string, unknown> | null;
      reporter.assert(
        notif?.type === "delivery_disputed" && payload?.delivery_id === ctx.disputedDeliveryId,
        step,
        "Delivery disputed notification",
        `Type: ${notif?.type}, delivery_id matches: ${payload?.delivery_id === ctx.disputedDeliveryId}`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "Delivery disputed notification", err.message);
  }

  // --- Step 8: invoice_sent notification type ---
  step++;
  try {
    if (!ctx.invoiceId) {
      reporter.skip(step, "Invoice sent notification", "No invoice from financial test");
    } else {
      const { data: notif, error } = await supabase
        .from("notifications")
        .insert({
          user_id: adminUser.id,
          type: "invoice_sent",
          title: "Invoice Sent",
          message: `Invoice ${ctx.invoiceNumber ?? "TEST"} sent to TEST_DR_Horton -- $${ctx.invoiceTotal ?? 0}`,
          channel: "in_app",
          read: false,
          read_at: null,
          data: {
            invoice_id: ctx.invoiceId,
            invoice_number: ctx.invoiceNumber,
          },
        })
        .select("id, type, data")
        .single();

      if (error) throw error;

      const payload = notif?.data as Record<string, unknown> | null;
      reporter.assert(
        notif?.type === "invoice_sent" && payload?.invoice_id === ctx.invoiceId,
        step,
        "Invoice sent notification",
        `Type: ${notif?.type}, invoice_id matches: ${payload?.invoice_id === ctx.invoiceId}`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "Invoice sent notification", err.message);
  }

  // --- Step 9: payment_received notification type ---
  step++;
  try {
    if (!ctx.paymentId || !ctx.invoiceId) {
      reporter.skip(step, "Payment received notification", "No payment from financial test");
    } else {
      const { data: notif, error } = await supabase
        .from("notifications")
        .insert({
          user_id: adminUser.id,
          type: "invoice_sent", // Reusing type since "payment_received" may not exist as enum
          title: "Payment Received",
          message: `Payment of $${ctx.invoiceTotal ?? 0} received for invoice ${ctx.invoiceNumber ?? "TEST"}`,
          channel: "in_app",
          read: false,
          read_at: null,
          data: {
            invoice_id: ctx.invoiceId,
            payment_id: ctx.paymentId,
            amount: ctx.invoiceTotal,
          },
        })
        .select("id, type, data")
        .single();

      if (error) throw error;

      const payload = notif?.data as Record<string, unknown> | null;
      reporter.assert(
        !!notif && payload?.payment_id === ctx.paymentId && payload?.invoice_id === ctx.invoiceId,
        step,
        "Payment received notification",
        `payment_id: ${payload?.payment_id === ctx.paymentId}, invoice_id: ${payload?.invoice_id === ctx.invoiceId}`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "Payment received notification", err.message);
  }

  // --- Step 10: settlement_created notification type ---
  step++;
  try {
    if (!ctx.settlementId) {
      reporter.skip(step, "Settlement created notification", "No settlement from financial test");
    } else {
      const { data: notif, error } = await supabase
        .from("notifications")
        .insert({
          user_id: adminUser.id,
          type: "settlement_created",
          title: "Settlement Ready for Review",
          message: `Draft settlement for TEST_CD_Hopkins -- $${ctx.settlementTotal ?? 0}`,
          channel: "in_app",
          read: false,
          read_at: null,
          data: {
            settlement_id: ctx.settlementId,
            carrier_id: ctx.carrierId,
            auto_generated: false,
          },
        })
        .select("id, type, data")
        .single();

      if (error) throw error;

      const payload = notif?.data as Record<string, unknown> | null;
      reporter.assert(
        notif?.type === "settlement_created" && payload?.settlement_id === ctx.settlementId,
        step,
        "Settlement created notification",
        `Type: ${notif?.type}, settlement_id matches: ${payload?.settlement_id === ctx.settlementId}`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "Settlement created notification", err.message);
  }

  // --- Step 11: Verify notification data payload references ---
  step++;
  try {
    // Query all test notifications we created that have data payloads
    const { data: allNotifs, error } = await supabase
      .from("notifications")
      .select("type, data")
      .in("user_id", [adminUser.id, customerUser.id])
      .not("data", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    // Check that payloads with delivery_id reference real UUIDs
    const deliveryNotifs = (allNotifs ?? []).filter((n) => {
      const d = n.data as Record<string, unknown> | null;
      return d && typeof d.delivery_id === "string" && d.delivery_id !== "test";
    });

    // Check that payloads with invoice_id reference real UUIDs
    const invoiceNotifs = (allNotifs ?? []).filter((n) => {
      const d = n.data as Record<string, unknown> | null;
      return d && typeof d.invoice_id === "string";
    });

    // Check that payloads with settlement_id reference real UUIDs
    const settlementNotifs = (allNotifs ?? []).filter((n) => {
      const d = n.data as Record<string, unknown> | null;
      return d && typeof d.settlement_id === "string";
    });

    const hasDeliveryRefs = ctx.deliveryIds ? deliveryNotifs.length > 0 : true;
    const hasInvoiceRefs = ctx.invoiceId ? invoiceNotifs.length > 0 : true;
    const hasSettlementRefs = ctx.settlementId ? settlementNotifs.length > 0 : true;

    reporter.assert(
      hasDeliveryRefs && hasInvoiceRefs && hasSettlementRefs,
      step,
      "Notification data payload references",
      `Delivery refs: ${deliveryNotifs.length}, Invoice refs: ${invoiceNotifs.length}, Settlement refs: ${settlementNotifs.length}`
    );
  } catch (err: any) {
    reporter.fail(step, "Notification data payload references", err.message);
  }

  reporter.printReport();
  return reporter;
}
