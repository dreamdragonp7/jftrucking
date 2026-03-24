/**
 * 09 - Dashboard Tests
 *
 * Tests dashboard data queries and KPI verification.
 * Mirrors the EXACT queries used in dashboard.loader.ts to verify
 * that the dashboard would render correct data from test entities.
 *
 * Tests:
 *  1. Today's deliveries count includes test deliveries
 *  2. Monthly revenue includes test invoice (sent/paid status)
 *  3. Outstanding AR (invoices with status = 'sent')
 *  4. Recent deliveries with full join chain (deliveries -> dispatches -> POs -> customers)
 *  5. PO threshold alerts (quantity_delivered/quantity_ordered >= 0.8)
 *  6. Active PO count includes test PO
 *  7. QB health check (connection status)
 *  8. Margin calculation (revenue - carrier settlements)
 */

import {
  createAdminClient,
  assertSandboxMode,
  TestReporter,
} from "../lib/test-helpers";
import type { TestContext } from "../lib/types";

export async function runDashboardTests(ctx: TestContext): Promise<TestReporter> {
  const reporter = new TestReporter("09-Dashboard");
  const supabase = createAdminClient();
  await assertSandboxMode(supabase);

  console.log("--- 09: Dashboard ---\n");

  let step = 0;

  const today = new Date().toISOString().split("T")[0];
  const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;

  // --- Step 1: Today's deliveries (same query as dashboard.loader.ts line 176-179) ---
  step++;
  try {
    const { count, error } = await supabase
      .from("deliveries")
      .select("id", { count: "exact", head: true })
      .gte("delivered_at", `${today}T00:00:00`)
      .lte("delivered_at", `${today}T23:59:59`);

    if (error) throw error;

    const deliveryCount = count ?? 0;
    // We created 4 deliveries today
    reporter.assert(
      deliveryCount >= 4,
      step,
      "Today's deliveries count",
      `Count: ${deliveryCount} (expected >= 4)`
    );
  } catch (err: any) {
    reporter.fail(step, "Today's deliveries count", err.message);
  }

  // --- Step 2: Monthly revenue (same query as dashboard.loader.ts line 196-199) ---
  step++;
  try {
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("total")
      .gte("created_at", monthStart)
      .in("status", ["sent", "paid"]);

    if (error) throw error;

    const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total ?? 0), 0) ?? 0;

    reporter.assert(
      totalRevenue > 0,
      step,
      "Monthly revenue includes test invoice",
      `Total monthly revenue: $${totalRevenue}`
    );
  } catch (err: any) {
    reporter.fail(step, "Monthly revenue includes test invoice", err.message);
  }

  // --- Step 3: Outstanding AR (same query as dashboard.loader.ts line 204-206) ---
  step++;
  try {
    // First ensure we have at least one sent invoice. The test invoice was paid
    // in 06-financials. Create a separate test invoice in "sent" status for AR.
    let sentInvoiceId: string | null = null;

    // Check if there are any sent invoices already (from prior tests or cron)
    const { data: sentInvoices, error: sentErr } = await supabase
      .from("invoices")
      .select("id, total")
      .eq("status", "sent");

    if (sentErr) throw sentErr;

    if (!sentInvoices || sentInvoices.length === 0) {
      // Create a minimal sent invoice for AR testing
      const { data: arInvoice, error: arErr } = await supabase
        .from("invoices")
        .insert({
          customer_id: ctx.customerId,
          invoice_number: "TEST-AR-001",
          status: "sent",
          sent_at: new Date().toISOString(),
          total: 555,
          period_start: monthStart,
          period_end: today,
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        })
        .select("id")
        .single();

      if (arErr) throw new Error(`AR invoice creation failed: ${arErr.message}`);
      sentInvoiceId = arInvoice!.id;
    }

    // Now query outstanding AR (same as dashboard)
    const { data: outstanding, error: outErr } = await supabase
      .from("invoices")
      .select("total")
      .eq("status", "sent");

    if (outErr) throw outErr;

    const arTotal = outstanding?.reduce((sum, inv) => sum + (inv.total ?? 0), 0) ?? 0;

    reporter.assert(
      arTotal > 0,
      step,
      "Outstanding AR (sent invoices)",
      `Outstanding AR total: $${arTotal}, Sent invoice count: ${outstanding?.length ?? 0}`
    );

    // Store for cleanup
    if (sentInvoiceId) {
      ctx.partialInvoiceId = sentInvoiceId;
    }
  } catch (err: any) {
    reporter.fail(step, "Outstanding AR (sent invoices)", err.message);
  }

  // --- Step 4: Recent deliveries with join chain (same as dashboard.loader.ts line 241-258) ---
  step++;
  try {
    const { data: recent, error } = await supabase
      .from("deliveries")
      .select(`
        id,
        ticket_number,
        net_weight,
        confirmation_status,
        delivered_at,
        driver:drivers(name),
        material:materials(name, unit_of_measure),
        dispatch:dispatches(
          purchase_order:purchase_orders(
            customer:customers(name)
          )
        )
      `)
      .order("delivered_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    const testDeliveries = recent?.filter(
      (d) => d.ticket_number?.startsWith("TEST-TKT-")
    ) ?? [];

    // Verify join chain reaches customer name
    let customerNameFound = false;
    for (const d of testDeliveries) {
      const dispatch = d.dispatch as unknown as {
        purchase_order?: { customer?: { name?: string } };
      } | null;
      if (dispatch?.purchase_order?.customer?.name === "TEST_DR_Horton") {
        customerNameFound = true;
        break;
      }
    }

    reporter.assert(
      testDeliveries.length >= 4 && customerNameFound,
      step,
      "Recent deliveries with join chain",
      `Test deliveries in top 10: ${testDeliveries.length}, Customer name resolved: ${customerNameFound}`
    );
  } catch (err: any) {
    reporter.fail(step, "Recent deliveries with join chain", err.message);
  }

  // --- Step 5: PO threshold alerts (same logic as dashboard.loader.ts line 371-387) ---
  step++;
  try {
    const { data: activePOs, error } = await supabase
      .from("purchase_orders")
      .select("id, po_number, quantity_ordered, quantity_delivered")
      .eq("status", "active");

    if (error) throw error;

    const nearingThreshold = activePOs?.filter((po) => {
      const totalQty = po.quantity_ordered ?? 0;
      const deliveredQty = po.quantity_delivered ?? 0;
      return totalQty > 0 && deliveredQty / totalQty >= 0.8;
    }) ?? [];

    // Our test PO has 4/5 = 0.8, so it should be at threshold
    const testPOAtThreshold = nearingThreshold.find(
      (p) => p.po_number === "TEST-PO-001"
    );

    reporter.assert(
      !!testPOAtThreshold,
      step,
      "PO threshold alerts (>=80%)",
      `POs at threshold: ${nearingThreshold.length}, TEST-PO-001 at threshold: ${!!testPOAtThreshold}` +
        (testPOAtThreshold
          ? ` (${testPOAtThreshold.quantity_delivered}/${testPOAtThreshold.quantity_ordered})`
          : "")
    );
  } catch (err: any) {
    reporter.fail(step, "PO threshold alerts (>=80%)", err.message);
  }

  // --- Step 6: Active PO count ---
  step++;
  try {
    const { data: activePOs, error } = await supabase
      .from("purchase_orders")
      .select("id, po_number, status")
      .eq("status", "active");

    if (error) throw error;

    const testPO = activePOs?.find((p) => p.po_number === "TEST-PO-001");

    reporter.assert(
      !!testPO,
      step,
      "Active PO includes test PO",
      `Active POs: ${activePOs?.length ?? 0}, TEST-PO-001 found: ${!!testPO}`
    );
  } catch (err: any) {
    reporter.fail(step, "Active PO includes test PO", err.message);
  }

  // --- Step 7: QB health check (same logic as dashboard.loader.ts line 510-520) ---
  step++;
  try {
    // Check if QB tokens exist in app_settings (same query as dashboard)
    const { data: qbTokens, error: qbErr } = await supabase
      .from("app_settings")
      .select("key")
      .like("key", "qb_%_access_token")
      .limit(2);

    if (qbErr) throw qbErr;

    // Check last sync
    const { data: lastSync } = await supabase
      .from("qb_sync_log")
      .select("synced_at")
      .eq("status", "success")
      .order("synced_at", { ascending: false })
      .limit(1);

    // Check failed syncs in last 24h
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const { count: failedCount } = await supabase
      .from("qb_sync_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", yesterday);

    const isConnected = (qbTokens?.length ?? 0) >= 1;
    const lastSyncAt = lastSync?.[0]?.synced_at ?? null;

    reporter.assert(
      isConnected,
      step,
      "QB health status",
      `Connected: ${isConnected}, Last sync: ${lastSyncAt ?? "never"}, Failed (24h): ${failedCount ?? 0}`
    );
  } catch (err: any) {
    reporter.fail(step, "QB health status", err.message);
  }

  // --- Step 8: Margin calculation (same logic as dashboard.loader.ts line 486-497) ---
  step++;
  try {
    // Get monthly revenue
    const { data: revenueInvoices } = await supabase
      .from("invoices")
      .select("total")
      .gte("created_at", monthStart)
      .in("status", ["sent", "paid"]);

    const monthRevenue = (revenueInvoices ?? []).reduce(
      (sum, inv) => sum + (inv.total ?? 0), 0
    );

    // Get carrier settlements this month (same as dashboard.loader.ts line 276-279)
    const { data: monthSettlements } = await supabase
      .from("carrier_settlements")
      .select("hauling_amount, dispatch_fee, total_amount, status")
      .gte("period_start", monthStart)
      .in("status", ["draft", "approved", "paid"]);

    const carrierPayTotal = (monthSettlements ?? []).reduce(
      (sum, s) => sum + (s.hauling_amount ?? 0), 0
    );
    const dispatchFeeTotal = (monthSettlements ?? []).reduce(
      (sum, s) => sum + (s.dispatch_fee ?? 0), 0
    );

    const grossMargin = monthRevenue - carrierPayTotal - dispatchFeeTotal;
    const marginPercent = monthRevenue > 0
      ? Math.round((grossMargin / monthRevenue) * 100)
      : 0;

    // With test data: revenue should be positive and margin calculable
    const marginCalculable = monthRevenue > 0 && typeof grossMargin === "number";

    reporter.assert(
      marginCalculable,
      step,
      "Margin calculation",
      `Revenue: $${monthRevenue}, Carrier pay: $${carrierPayTotal}, ` +
        `Dispatch fee: $${dispatchFeeTotal}, Gross margin: $${grossMargin} (${marginPercent}%)`
    );
  } catch (err: any) {
    reporter.fail(step, "Margin calculation", err.message);
  }

  reporter.printReport();
  return reporter;
}
