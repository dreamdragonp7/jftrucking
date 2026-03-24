import { NextResponse, type NextRequest } from "next/server";

/**
 * Cron: Auto-Settlement Generation.
 * Runs biweekly (1st and 15th of each month) at noon UTC (6 AM CT).
 *
 * For each active carrier with confirmed deliveries in the settlement period,
 * generates a DRAFT settlement via settlementService.generateSettlement().
 *
 * Settlements are created as DRAFT only — Nene reviews and approves manually.
 * No auto-approve. No auto-pay. Human review required.
 *
 * Idempotent: checks for existing settlements covering the same period per
 * carrier before generating. Safe to re-run.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] Auto-settlement generation started");

  const stats = {
    settlements_generated: 0,
    carriers_skipped: 0,
    errors: 0,
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

    // -- Get active carriers --------------------------------------------------
    const { data: carriers, error: carrierErr } = await supabase
      .from("carriers")
      .select("*")
      .eq("status", "active");

    if (carrierErr) {
      console.error("[Cron] Failed to fetch carriers:", carrierErr.message);
      return NextResponse.json(
        { status: "error", error: carrierErr.message, ...stats, timestamp: new Date().toISOString() },
        { status: 500 }
      );
    }

    if (!carriers || carriers.length === 0) {
      console.log("[Cron] No active carriers found");
      return NextResponse.json({
        status: "completed",
        reason: "No active carriers",
        ...stats,
        timestamp: new Date().toISOString(),
      });
    }

    // -- Get admin users for notifications ------------------------------------
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("status", "active");

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const periodEndDefault = yesterday.toISOString().split("T")[0];

    // -- Process each carrier -------------------------------------------------
    for (const carrier of carriers) {
      try {
        // Determine settlement period for this carrier
        const { data: lastSettlement } = await supabase
          .from("carrier_settlements")
          .select("period_end")
          .eq("carrier_id", carrier.id)
          .not("status", "eq", "cancelled")
          .order("period_end", { ascending: false })
          .limit(1);

        let periodStart: string;
        const periodEnd = periodEndDefault;

        if (lastSettlement && lastSettlement.length > 0 && lastSettlement[0].period_end) {
          const lastEnd = new Date(lastSettlement[0].period_end + "T00:00:00");
          lastEnd.setDate(lastEnd.getDate() + 1);
          periodStart = lastEnd.toISOString().split("T")[0];
        } else {
          // No previous settlements -- default to 14 days ago
          const fourteenDaysAgo = new Date(today);
          fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
          periodStart = fourteenDaysAgo.toISOString().split("T")[0];
        }

        // Guard: nothing to settle
        if (periodStart > periodEnd) {
          console.log(
            `[Cron] Skipping ${carrier.name} -- period start ${periodStart} > end ${periodEnd}`
          );
          stats.carriers_skipped++;
          continue;
        }

        // Idempotency: check if settlement already exists for this period
        const { data: existingSettlements } = await supabase
          .from("carrier_settlements")
          .select("id")
          .eq("carrier_id", carrier.id)
          .eq("period_start", periodStart)
          .eq("period_end", periodEnd);

        if (existingSettlements && existingSettlements.length > 0) {
          console.log(
            `[Cron] Skipping ${carrier.name} -- settlement already exists for ${periodStart} to ${periodEnd}`
          );
          stats.carriers_skipped++;
          continue;
        }

        // -- Delegate to settlement service (has the correct rate math) --------
        const { generateSettlement } = await import(
          "@/lib/services/settlement.service"
        );

        let settlement;
        try {
          settlement = await generateSettlement(carrier.id, periodStart, periodEnd, supabase);
        } catch (genErr) {
          const msg = genErr instanceof Error ? genErr.message : String(genErr);
          // "No confirmed deliveries" is not an error — just skip
          if (msg.includes("No confirmed deliveries")) {
            stats.carriers_skipped++;
            continue;
          }
          // "No carrier rate configured" needs attention
          console.error(`[Cron] Settlement generation failed for ${carrier.name}: ${msg}`);
          stats.errors++;
          continue;
        }

        stats.settlements_generated++;
        console.log(
          `[Cron] Settlement generated for ${carrier.name}: $${settlement.total_amount.toFixed(2)} ` +
          `(${periodStart} to ${periodEnd}) — status: draft (awaiting manual review)`
        );

        // -- Admin notification (settlement needs review) ----------------------
        if (admins && admins.length > 0) {
          try {
            const adminNotifs = admins.map((admin) => ({
              user_id: admin.id,
              type: "settlement_created" as const,
              title: "Settlement Ready for Review",
              message: `Draft settlement for ${carrier.name} -- $${settlement.total_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${periodStart} to ${periodEnd}). Please review and approve.`,
              channel: "in_app" as const,
              read: false,
              read_at: null,
              data: {
                settlement_id: settlement.id,
                carrier_id: carrier.id,
                auto_generated: true,
              },
            }));

            const { error: notifErr } = await supabase
              .from("notifications")
              .insert(adminNotifs);
            if (notifErr) {
              console.warn(
                `[Cron] Failed to create admin notification for ${carrier.name} settlement:`,
                notifErr.message
              );
            }
          } catch (notifErr) {
            console.warn(
              `[Cron] Admin notification failed for ${carrier.name} settlement:`,
              notifErr instanceof Error ? notifErr.message : notifErr
            );
          }
        }
      } catch (carrierErr) {
        console.error(
          `[Cron] Settlement generation failed for ${carrier.name}:`,
          carrierErr instanceof Error ? carrierErr.message : carrierErr
        );
        stats.errors++;
      }
    }

    console.log(
      `[Cron] Auto-settlement completed: ${stats.settlements_generated} generated (as draft), ` +
      `${stats.carriers_skipped} skipped, ${stats.errors} errors`
    );

    return NextResponse.json({
      status: "completed",
      carriers_processed: carriers.length,
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Cron] Auto-settlement error:", err);
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
