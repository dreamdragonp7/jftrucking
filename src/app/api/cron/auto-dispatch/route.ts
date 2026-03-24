import { NextResponse, type NextRequest } from "next/server";

/**
 * Cron: Auto-Dispatch.
 * Runs daily at 5 PM CT (23:00 UTC) via Vercel Cron.
 *
 * For every active purchase order with remaining quantity, creates up to
 * `auto_dispatch_daily_limit` dispatches for tomorrow (default: 10 per PO).
 * Each dispatch represents one truck trip (1 load). Sends an SMS
 * notification (fire-and-forget) after each dispatch is created.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] Auto-dispatch started");

  const stats = {
    created: 0,
    skipped_existing: 0,
    skipped_no_pickup: 0,
    failed: 0,
  };

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({
        status: "skipped",
        reason: "Supabase not configured",
        timestamp: new Date().toISOString(),
      });
    }

    // Load the daily dispatch limit from settings
    const { getBusinessSettingNumber } = await import(
      "@/lib/utils/settings"
    );
    const dailyLimit = await getBusinessSettingNumber(
      "auto_dispatch_daily_limit"
    );

    // ── Compute tomorrow's date ──────────────────────────────────────
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split("T")[0];

    // ── Get active POs with remaining quantity ───────────────────────
    const { data: activePOs, error: poError } = await supabase
      .from("purchase_orders")
      .select("*, customer:customers(id, name), material:materials(id, name), delivery_site:sites(id, name)")
      .eq("status", "active");

    if (poError) {
      console.error("[Cron] Failed to fetch active POs:", poError.message);
      return NextResponse.json(
        { status: "error", error: poError.message, ...stats, timestamp: new Date().toISOString() },
        { status: 500 }
      );
    }

    // Filter to POs that still have remaining quantity
    const unfulfilled = (activePOs ?? []).filter(
      (po) => po.quantity_delivered < po.quantity_ordered
    );

    if (unfulfilled.length === 0) {
      console.log("[Cron] No active POs with remaining quantity");
      return NextResponse.json({
        status: "completed",
        ...stats,
        timestamp: new Date().toISOString(),
      });
    }

    // ── Get the active driver (single-driver operation) ──────────────
    const { data: drivers, error: driverError } = await supabase
      .from("drivers")
      .select("*, carrier:carriers(id, name)")
      .eq("status", "active")
      .limit(1);

    if (driverError) {
      console.error("[Cron] Failed to fetch active drivers:", driverError.message);
      return NextResponse.json(
        { status: "error", error: driverError.message, ...stats, timestamp: new Date().toISOString() },
        { status: 500 }
      );
    }

    if (!drivers || drivers.length === 0) {
      console.warn("[Cron] No active drivers found — cannot auto-dispatch");
      return NextResponse.json({
        status: "completed",
        warning: "No active drivers",
        ...stats,
        timestamp: new Date().toISOString(),
      });
    }

    const driver = drivers[0];
    const carrierId = driver.carrier_id;
    const driverId = driver.id;
    const truckId = driver.truck_id;

    if (!truckId) {
      console.warn(`[Cron] Active driver ${driver.name} has no truck assigned`);
      return NextResponse.json({
        status: "completed",
        warning: `Driver ${driver.name} has no truck assigned`,
        ...stats,
        timestamp: new Date().toISOString(),
      });
    }

    // ── Pre-fetch existing dispatches for tomorrow to count per PO ───
    const { data: existingDispatches } = await supabase
      .from("dispatches")
      .select("purchase_order_id")
      .eq("scheduled_date", tomorrowDate)
      .neq("status", "cancelled");

    // Count existing dispatches per PO for tomorrow
    const existingCountByPO = new Map<string, number>();
    for (const d of existingDispatches ?? []) {
      if (d.purchase_order_id) {
        existingCountByPO.set(
          d.purchase_order_id,
          (existingCountByPO.get(d.purchase_order_id) ?? 0) + 1
        );
      }
    }

    // ── Pre-fetch rates to resolve pickup sites ──────────────────────
    // Rates have pickup_site_id which POs lack. Match on material + delivery_site.
    const today = new Date().toISOString().split("T")[0];
    const { data: rates } = await supabase
      .from("rates")
      .select("material_id, delivery_site_id, pickup_site_id")
      .not("pickup_site_id", "is", null)
      .lte("effective_date", today)
      .or(`expiration_date.is.null,expiration_date.gte.${today}`);

    // Build a lookup: "materialId:deliverySiteId" -> pickup_site_id
    const pickupSiteLookup = new Map<string, string>();
    for (const rate of rates ?? []) {
      if (rate.pickup_site_id && rate.delivery_site_id) {
        const key = `${rate.material_id}:${rate.delivery_site_id}`;
        if (!pickupSiteLookup.has(key)) {
          pickupSiteLookup.set(key, rate.pickup_site_id);
        }
      }
    }

    // Fallback: get active quarry/plant sites (also used for name lookup)
    const { data: pickupSites } = await supabase
      .from("sites")
      .select("id, name")
      .in("type", ["quarry", "plant"])
      .eq("status", "active");

    const pickupSiteNameMap = new Map<string, string>();
    for (const site of pickupSites ?? []) {
      pickupSiteNameMap.set(site.id, site.name);
    }

    const fallbackPickupSiteId = pickupSites?.[0]?.id ?? null;

    // ── Twilio config check (for SMS notifications) ──────────────────
    const twilioConfigured = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );

    // ── Process each active PO ───────────────────────────────────────
    for (const po of unfulfilled) {
      // Calculate remaining quantity for this PO
      const remaining = po.quantity_ordered - po.quantity_delivered;

      // Calculate how many dispatches already exist for tomorrow for this PO
      const existingForPO = existingCountByPO.get(po.id) ?? 0;

      // Calculate how many new dispatches to create
      // min(remaining loads, daily limit) minus already-existing dispatches
      const targetCount = Math.min(remaining, dailyLimit);
      const toCreate = Math.max(0, targetCount - existingForPO);

      if (toCreate === 0) {
        stats.skipped_existing++;
        continue;
      }

      // Resolve pickup site: rate lookup -> fallback quarry/plant
      const rateKey = `${po.material_id}:${po.delivery_site_id}`;
      const pickupSiteId = pickupSiteLookup.get(rateKey) ?? fallbackPickupSiteId;

      if (!pickupSiteId) {
        console.warn(
          `[Cron] Skipping PO ${po.po_number} — no pickup site found (no matching rate, no quarry/plant sites)`
        );
        stats.skipped_no_pickup++;
        continue;
      }

      // Create multiple dispatches for this PO
      for (let i = 0; i < toCreate; i++) {
        const { data: dispatch, error: createError } = await supabase
          .from("dispatches")
          .insert({
            carrier_id: carrierId,
            driver_id: driverId,
            truck_id: truckId,
            material_id: po.material_id,
            pickup_site_id: pickupSiteId,
            delivery_site_id: po.delivery_site_id,
            purchase_order_id: po.id,
            scheduled_date: tomorrowDate,
            status: "dispatched" as const,
            dispatched_at: new Date().toISOString(),
            order_id: null,
            acknowledged_at: null,
            notes: `Auto-dispatched for PO ${po.po_number} (${i + 1 + existingForPO}/${targetCount})`,
          })
          .select()
          .single();

        if (createError) {
          console.error(
            `[Cron] Failed to create dispatch for PO ${po.po_number}:`,
            createError.message
          );
          stats.failed++;
          continue;
        }

        stats.created++;
        console.log(
          `[Cron] Created dispatch ${dispatch.id} for PO ${po.po_number} on ${tomorrowDate} (${i + 1 + existingForPO}/${targetCount})`
        );
      }

      // Fire-and-forget: SMS notification to driver (one per PO, not per dispatch)
      if (twilioConfigured && driver.phone && toCreate > 0) {
        try {
          const { sendDispatchSMS } = await import(
            "@/lib/integrations/twilio/client"
          );

          const materialName =
            (po.material as unknown as { name: string } | null)?.name ?? "Material";
          const deliverySiteName =
            (po.delivery_site as unknown as { name: string } | null)?.name ?? "Delivery";
          const pickupSiteName = pickupSiteNameMap.get(pickupSiteId) ?? "Pickup";

          await sendDispatchSMS(driver.phone, {
            material: materialName,
            pickupSite: pickupSiteName,
            deliverySite: deliverySiteName,
            scheduledDate: tomorrowDate,
            loadCount: toCreate,
          });
        } catch (smsErr) {
          console.warn(
            `[Cron] SMS failed for PO ${po.po_number} (non-blocking):`,
            smsErr instanceof Error ? smsErr.message : smsErr
          );
        }
      }
    }

    console.log(
      `[Cron] Auto-dispatch completed: ${stats.created} created, ${stats.skipped_existing} skipped (existing/at limit), ${stats.skipped_no_pickup} skipped (no pickup), ${stats.failed} failed`
    );

    return NextResponse.json({
      status: "completed",
      ...stats,
      daily_limit: dailyLimit,
      active_pos: unfulfilled.length,
      scheduled_for: tomorrowDate,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Cron] Auto-dispatch error:", err);
    return NextResponse.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        ...stats,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
