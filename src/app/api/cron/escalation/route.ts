import { NextResponse, type NextRequest } from "next/server";

/**
 * Cron: Escalation checks.
 * Runs every 4 hours via Vercel Cron.
 *
 * Handles unconfirmed delivery escalation:
 * - > 4 hours: send reminder SMS to customer
 * - > 24 hours: escalate to admin (in-app notification)
 * - > 168 hours (7 days): auto-confirm and notify admin
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] Escalation checks started");

  const stats = {
    reminders: 0,
    escalations: 0,
    autoConfirmed: 0,
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

    // Read auto_confirm_days from business settings
    const { getBusinessSettingNumber } = await import("@/lib/utils/settings");
    const autoConfirmDays = await getBusinessSettingNumber("auto_confirm_days");
    const autoConfirmMs = autoConfirmDays * 24 * 60 * 60 * 1000;

    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const autoConfirmCutoff = new Date(now.getTime() - autoConfirmMs);

    // Get all pending deliveries
    const { data: pendingDeliveries, error } = await supabase
      .from("deliveries")
      .select(`
        id,
        delivered_at,
        ticket_number,
        net_weight,
        dispatch_id,
        dispatch:dispatches(
          purchase_order:purchase_orders(
            customer_id,
            po_number,
            customer:customers(name, phone)
          ),
          material:materials(name),
          delivery_site:sites(name)
        )
      `)
      .eq("confirmation_status", "pending")
      .order("delivered_at", { ascending: true });

    if (error) {
      console.error("[Cron] Failed to fetch pending deliveries:", error);
      return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }

    if (!pendingDeliveries || pendingDeliveries.length === 0) {
      console.log("[Cron] No pending deliveries found");
      return NextResponse.json({
        status: "completed",
        ...stats,
        timestamp: new Date().toISOString(),
      });
    }

    // Get admin users for escalation
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, phone")
      .eq("role", "admin")
      .eq("status", "active");

    // Process each pending delivery
    for (const delivery of pendingDeliveries) {
      const deliveredAt = new Date(delivery.delivered_at);
      const hoursElapsed = (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60);

      const dispatch = delivery.dispatch as unknown as Record<string, unknown> | null;
      const po = dispatch?.purchase_order as unknown as Record<string, unknown> | null;
      const customer = po?.customer as { name?: string; phone?: string } | null;
      const materialName = (dispatch?.material as unknown as { name?: string } | null)?.name ?? "material";
      const siteName = (dispatch?.delivery_site as unknown as { name?: string } | null)?.name ?? "site";
      const ticketRef = delivery.ticket_number ?? `D-${delivery.id.slice(0, 6)}`;

      if (hoursElapsed >= autoConfirmDays * 24) {
        // Auto-confirm after configured days
        const { error: autoConfirmErr } = await supabase
          .from("deliveries")
          .update({
            confirmation_status: "confirmed",
            confirmed_at: now.toISOString(),
            confirmed_by: "system",
          })
          .eq("id", delivery.id);

        if (autoConfirmErr) {
          console.error("[Escalation] Failed to auto-confirm delivery:", delivery.id, autoConfirmErr.message);
          continue;
        }

        stats.autoConfirmed++;

        // Notify admins about auto-confirmation
        if (admins && admins.length > 0) {
          const adminNotifs = admins.map((a) => ({
            user_id: a.id,
            type: "escalation" as const,
            title: "Delivery Auto-Confirmed",
            message: `Load ${ticketRef} (${materialName} to ${siteName}) was auto-confirmed after ${autoConfirmDays} days without customer response.`,
            channel: "in_app" as const,
            read: false,
            read_at: null,
            data: { delivery_id: delivery.id, action: "auto_confirmed" },
          }));

          const { error: notifErr } = await supabase.from("notifications").insert(adminNotifs);
          if (notifErr) {
            console.error("[Escalation] Failed to insert auto-confirm admin notifications:", notifErr.message);
          }
        }

        console.log(`[Cron] Auto-confirmed delivery ${delivery.id} after ${Math.round(hoursElapsed)}h`);
      } else if (hoursElapsed >= 24) {
        // 24+ hours: escalate to admin
        stats.escalations++;

        if (admins && admins.length > 0) {
          // Check if we already escalated (don't spam)
          const { count } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("type", "escalation")
            .contains("data", { delivery_id: delivery.id, action: "escalated" });

          if (!count || count === 0) {
            const adminNotifs = admins.map((a) => ({
              user_id: a.id,
              type: "escalation" as const,
              title: "Unconfirmed Delivery - Escalated",
              message: `Load ${ticketRef} for ${customer?.name ?? "Unknown"} has been unconfirmed for ${Math.round(hoursElapsed)} hours. ${materialName} to ${siteName}.`,
              channel: "in_app" as const,
              read: false,
              read_at: null,
              data: { delivery_id: delivery.id, action: "escalated", hours: Math.round(hoursElapsed) },
            }));

            const { error: escalateNotifErr } = await supabase.from("notifications").insert(adminNotifs);
            if (escalateNotifErr) {
              console.error("[Escalation] Failed to insert escalation notifications:", escalateNotifErr.message);
            }
          }
        }
      } else if (hoursElapsed >= 4) {
        // 4+ hours: send reminder to customer
        stats.reminders++;

        // Find customer portal users
        const customerId = po?.customer_id as string | undefined;
        if (customerId) {
          const { data: customerProfiles } = await supabase
            .from("profiles")
            .select("id, phone")
            .eq("company_name", customer?.name ?? "")
            .eq("role", "customer")
            .eq("status", "active");

          if (customerProfiles && customerProfiles.length > 0) {
            // Check if we already sent a reminder for this delivery
            const { count } = await supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("type", "delivery_confirmed")
              .in("user_id", customerProfiles.map((p) => p.id))
              .contains("data", { delivery_id: delivery.id, action: "reminder" });

            if (!count || count === 0) {
              const notifications = customerProfiles.map((p) => ({
                user_id: p.id,
                type: "delivery_confirmed" as const,
                title: "Delivery Awaiting Confirmation",
                message: `Load ${ticketRef} (${materialName} to ${siteName}) has been pending confirmation for ${Math.round(hoursElapsed)} hours. Please confirm or dispute.`,
                channel: "in_app" as const,
                read: false,
                read_at: null,
                data: { delivery_id: delivery.id, action: "reminder" },
              }));

              const { error: reminderNotifErr } = await supabase.from("notifications").insert(notifications);
              if (reminderNotifErr) {
                console.error("[Escalation] Failed to insert reminder notifications:", reminderNotifErr.message);
              }
            }
          }

          // SMS reminder to customer phone
          if (customer?.phone) {
            try {
              const isTwilioConfigured = Boolean(
                process.env.TWILIO_ACCOUNT_SID &&
                process.env.TWILIO_AUTH_TOKEN &&
                process.env.TWILIO_PHONE_NUMBER
              );

              if (isTwilioConfigured) {
                const twilio = await import("twilio");
                const client = twilio.default(
                  process.env.TWILIO_ACCOUNT_SID!,
                  process.env.TWILIO_AUTH_TOKEN!
                );

                const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
                await client.messages.create({
                  to: customer.phone,
                  from: process.env.TWILIO_PHONE_NUMBER!,
                  body: `JFT Reminder: Load ${ticketRef} delivered ${Math.round(hoursElapsed)}h ago is awaiting your confirmation. Confirm at ${appUrl}/customer/deliveries`,
                });
              }
            } catch (smsErr) {
              console.error(`[Cron] Failed to send escalation SMS for ${ticketRef}:`, smsErr);
            }
          }
        }
      }
    }

    console.log(`[Cron] Escalation completed: ${stats.reminders} reminders, ${stats.escalations} escalations, ${stats.autoConfirmed} auto-confirmed`);

    return NextResponse.json({
      status: "completed",
      ...stats,
      pending_total: pendingDeliveries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Cron] Escalation error:", err);
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
