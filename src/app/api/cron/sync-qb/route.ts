import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/cron/sync-qb
 *
 * Cron: Daily QuickBooks reconciliation.
 * Runs daily at 8 AM CT (14:00 UTC) via Vercel Cron.
 *
 * Actions:
 * 1. Run reconcileWithQBO() — compare Supabase records with QBO via CDC
 * 2. Check for unrecorded payments in QBO
 * 3. Log results
 * 4. Notify admin of any discrepancies
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] QuickBooks sync started");

  try {
    // Check if QB is configured and connected
    const { isQBConfigured, isConnected } = await import(
      "@/lib/integrations/quickbooks"
    );

    if (!isQBConfigured()) {
      console.log("[Cron] QuickBooks not configured — skipping sync");
      return NextResponse.json({
        status: "skipped",
        reason: "QuickBooks not configured",
        timestamp: new Date().toISOString(),
      });
    }

    const connected = await isConnected();
    if (!connected) {
      console.log("[Cron] QuickBooks not connected — skipping sync");
      return NextResponse.json({
        status: "skipped",
        reason: "QuickBooks not connected",
        timestamp: new Date().toISOString(),
      });
    }

    // Run reconciliation
    const { reconcileWithQBO } = await import(
      "@/lib/services/quickbooks.service"
    );
    const result = await reconcileWithQBO();

    if (!result.success) {
      console.error("[Cron] QuickBooks reconciliation failed:", result.error);
      return NextResponse.json({
        status: "failed",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    }

    // Notify admin of discrepancies
    if (result.discrepancies.length > 0) {
      console.warn(
        `[Cron] QB Reconciliation found ${result.discrepancies.length} discrepancies`
      );

      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const supabase = createAdminClient();
        if (supabase) {
          // Find admin users to notify
          const { data: admins } = await supabase
            .from("profiles")
            .select("id")
            .eq("role", "admin")
            .eq("status", "active");

          if (admins && admins.length > 0) {
            const notifications = admins.map((admin) => ({
              user_id: admin.id,
              type: "escalation" as const,
              title: "QuickBooks Sync Discrepancies",
              message: `Daily QB reconciliation found ${result.discrepancies.length} discrepancy(s). Review in QuickBooks settings.`,
              channel: "in_app" as const,
              read: false,
              read_at: null,
              data: {
                discrepancy_count: result.discrepancies.length,
                discrepancies: result.discrepancies.slice(0, 5), // First 5 for preview
              },
            }));

            const { error: notifErr } = await supabase.from("notifications").insert(notifications);
            if (notifErr) {
              console.error("[Cron] Failed to insert QB sync discrepancy notifications:", notifErr.message);
            }
          }
        }
      } catch (notifyErr) {
        console.error("[Cron] Failed to notify admins:", notifyErr);
      }
    }

    console.log(
      `[Cron] QuickBooks sync completed: ${result.discrepancies.length} discrepancies`
    );

    return NextResponse.json({
      status: "completed",
      discrepancies: result.discrepancies.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Cron] QuickBooks sync error:", err);
    return NextResponse.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
