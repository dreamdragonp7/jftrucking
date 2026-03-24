import { NextResponse, type NextRequest } from "next/server";

/**
 * Cron: Send payment reminders.
 * Runs daily at 3 PM CT (21:00 UTC) via Vercel Cron.
 * Sends in-app + SMS reminders for overdue invoices.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] Payment reminders started");

  let remindersSent = 0;

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

    const today = new Date().toISOString().split("T")[0];

    // Find overdue invoices (sent, past due date — overdue is computed, not stored)
    const { data: overdueInvoices, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, total, due_date, customer_id, customer:customers(name, billing_email, phone)")
      .eq("status", "sent")
      .lt("due_date", today)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("[Cron] Failed to fetch overdue invoices:", error);
      return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      console.log("[Cron] No overdue invoices found");
      return NextResponse.json({
        status: "completed",
        reminders_sent: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Send reminders for each overdue invoice
    for (const inv of overdueInvoices) {
      const customer = inv.customer as unknown as { name: string; billing_email?: string; phone?: string } | null;
      if (!customer) continue;

      const dueDate = new Date(inv.due_date);
      const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Find customer portal users
      const { data: customerProfiles } = await supabase
        .from("profiles")
        .select("id, phone")
        .eq("company_name", customer.name)
        .eq("role", "customer")
        .eq("status", "active");

      // Create in-app notifications for customer portal users
      if (customerProfiles && customerProfiles.length > 0) {
        const notifications = customerProfiles.map((p) => ({
          user_id: p.id,
          type: "invoice_sent" as const,
          title: "Payment Reminder",
          message: `Invoice ${inv.invoice_number} for $${(inv.total as number).toLocaleString("en-US", { minimumFractionDigits: 2 })} is ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue. Please arrange payment.`,
          channel: "in_app" as const,
          read: false,
          read_at: null,
          data: { invoice_id: inv.id, invoice_number: inv.invoice_number, days_overdue: daysOverdue },
        }));

        const { error: notifErr } = await supabase.from("notifications").insert(notifications);
        if (notifErr) {
          console.error("[Cron] Failed to insert customer reminder notifications:", notifErr.message);
        } else {
          remindersSent += notifications.length;
        }
      }

      // Send SMS to customer phone if configured
      if (customer.phone) {
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

            await client.messages.create({
              to: customer.phone,
              from: process.env.TWILIO_PHONE_NUMBER!,
              body: `JFT Reminder: Invoice ${inv.invoice_number} for $${(inv.total as number).toFixed(2)} is ${daysOverdue} days overdue. Please arrange payment. Contact jfudgetrucking@gmail.com for questions.`,
            });
          }
        } catch (smsErr) {
          console.error(`[Cron] Failed to send SMS reminder for ${inv.invoice_number}:`, smsErr);
        }
      }
    }

    // Notify admins about overdue invoices count
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("status", "active");

    if (admins && admins.length > 0 && overdueInvoices.length > 0) {
      const totalOverdue = overdueInvoices.reduce(
        (sum, inv) => sum + ((inv.total as number) ?? 0),
        0
      );

      const adminNotifications = admins.map((admin) => ({
        user_id: admin.id,
        type: "escalation" as const,
        title: "Overdue Invoice Summary",
        message: `${overdueInvoices.length} invoice${overdueInvoices.length === 1 ? "" : "s"} overdue totaling $${totalOverdue.toLocaleString("en-US", { minimumFractionDigits: 2 })}. Reminders have been sent.`,
        channel: "in_app" as const,
        read: false,
        read_at: null,
        data: {
          overdue_count: overdueInvoices.length,
          total_overdue: totalOverdue,
        },
      }));

      const { error: adminNotifErr } = await supabase.from("notifications").insert(adminNotifications);
      if (adminNotifErr) {
        console.error("[Cron] Failed to insert admin overdue notifications:", adminNotifErr.message);
      }
    }

    console.log(`[Cron] Payment reminders completed: ${remindersSent} reminders sent for ${overdueInvoices.length} overdue invoices`);

    return NextResponse.json({
      status: "completed",
      overdue_invoices: overdueInvoices.length,
      reminders_sent: remindersSent,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Cron] Payment reminders error:", err);
    return NextResponse.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        reminders_sent: remindersSent,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
