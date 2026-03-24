import { NextResponse, type NextRequest } from "next/server";

/**
 * Cron: Auto-Invoice Generation.
 * Schedule depends on customer billing_cycle:
 *   - biweekly: invoice on 1st and 15th
 *   - monthly:  invoice on 1st only
 *   - as_needed: skip (manual only)
 *
 * Delegates all math/creation to invoiceService.generateInvoice().
 * This cron only handles: auth, billing-cycle logic, email, QB sync, notifications.
 *
 * Idempotent: checks for existing invoices covering the same period before
 * generating. Safe to re-run.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] Auto-invoice generation started");

  const stats = {
    invoices_generated: 0,
    invoices_sent: 0,
    invoices_synced: 0,
    customers_skipped: 0,
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

    const today = new Date();
    const dayOfMonth = today.getDate();
    const isFirstOrFifteenth = dayOfMonth === 1 || dayOfMonth === 15;

    // Determine which billing cycles to process today
    const cyclesToProcess: string[] = [];
    if (isFirstOrFifteenth) {
      cyclesToProcess.push("biweekly");
    }
    if (dayOfMonth === 1) {
      cyclesToProcess.push("monthly");
    }
    // "as_needed" is never auto-invoiced

    if (cyclesToProcess.length === 0) {
      console.log(`[Cron] Day ${dayOfMonth} — no billing cycles to process`);
      return NextResponse.json({
        status: "completed",
        reason: `Day ${dayOfMonth} is not a billing date`,
        ...stats,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[Cron] Processing billing cycles: ${cyclesToProcess.join(", ")}`);

    // -- Get active customers with matching billing cycles -------------------
    const { data: customers, error: custErr } = await supabase
      .from("customers")
      .select("*")
      .eq("status", "active")
      .in("billing_cycle", cyclesToProcess);

    if (custErr) {
      console.error("[Cron] Failed to fetch customers:", custErr.message);
      return NextResponse.json(
        { status: "error", error: custErr.message, ...stats, timestamp: new Date().toISOString() },
        { status: 500 }
      );
    }

    if (!customers || customers.length === 0) {
      console.log("[Cron] No active customers with matching billing cycles");
      return NextResponse.json({
        status: "completed",
        reason: "No eligible customers",
        ...stats,
        timestamp: new Date().toISOString(),
      });
    }

    // -- Get admin users for notifications -----------------------------------
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("status", "active");

    // -- Process each customer -----------------------------------------------
    for (const customer of customers) {
      try {
        // Determine billing period for THIS customer
        const { data: lastInvoice } = await supabase
          .from("invoices")
          .select("period_end")
          .eq("customer_id", customer.id)
          .not("status", "eq", "cancelled")
          .order("period_end", { ascending: false })
          .limit(1);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const periodEnd = yesterday.toISOString().split("T")[0];

        let periodStart: string;
        if (lastInvoice && lastInvoice.length > 0 && lastInvoice[0].period_end) {
          const lastEnd = new Date(lastInvoice[0].period_end + "T00:00:00");
          lastEnd.setDate(lastEnd.getDate() + 1);
          periodStart = lastEnd.toISOString().split("T")[0];
        } else {
          // No previous invoices — default based on billing cycle
          const daysBack = customer.billing_cycle === "monthly" ? 30 : 14;
          const startDate = new Date(today);
          startDate.setDate(startDate.getDate() - daysBack);
          periodStart = startDate.toISOString().split("T")[0];
        }

        // Guard: nothing to invoice
        if (periodStart > periodEnd) {
          console.log(
            `[Cron] Skipping ${customer.name} — period start ${periodStart} > end ${periodEnd}`
          );
          stats.customers_skipped++;
          continue;
        }

        // Idempotency: check for existing invoice covering this exact period
        const { data: existingInvoices } = await supabase
          .from("invoices")
          .select("id")
          .eq("customer_id", customer.id)
          .eq("period_start", periodStart)
          .eq("period_end", periodEnd)
          .not("status", "eq", "cancelled");

        if (existingInvoices && existingInvoices.length > 0) {
          console.log(
            `[Cron] Skipping ${customer.name} — already invoiced for ${periodStart} to ${periodEnd}`
          );
          stats.customers_skipped++;
          continue;
        }

        // -- Delegate to invoice service (has the correct rate math) ----------
        const { generateInvoice, getInvoiceWithDetails } = await import(
          "@/lib/services/invoice.service"
        );

        let invoice;
        try {
          invoice = await generateInvoice(customer.id, periodStart, periodEnd, undefined, supabase);
        } catch (genErr) {
          const msg = genErr instanceof Error ? genErr.message : String(genErr);
          // "No confirmed deliveries" is not an error — just skip
          if (msg.includes("No confirmed deliveries")) {
            stats.customers_skipped++;
            continue;
          }
          // "No rate configured" is a real error that needs attention
          console.error(`[Cron] Invoice generation failed for ${customer.name}: ${msg}`);
          stats.errors++;
          continue;
        }

        stats.invoices_generated++;
        console.log(
          `[Cron] Invoice ${invoice.invoice_number} generated for ${customer.name}: $${invoice.total.toFixed(2)}`
        );

        // -- Send invoice email, THEN mark as sent ----------------------------
        try {
          const fullInvoice = await getInvoiceWithDetails(invoice.id, supabase);

          if (fullInvoice) {
            const { renderToBuffer } = await import("@react-pdf/renderer");
            const React = await import("react");
            const { InvoicePDF } = await import("@/lib/pdf/invoice-template");
            const { sendInvoiceEmail } = await import("@/lib/services/email.service");

            const pdfElement = React.createElement(InvoicePDF, { invoice: fullInvoice });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pdfBuffer = await renderToBuffer(pdfElement as any);

            const emailResult = await sendInvoiceEmail(fullInvoice, pdfBuffer);

            if (emailResult.success) {
              // Only mark as sent AFTER email succeeds
              const sentAt = new Date().toISOString();
              await supabase
                .from("invoices")
                .update({ status: "sent" as const, sent_at: sentAt })
                .eq("id", invoice.id);

              stats.invoices_sent++;
              console.log(`[Cron] Invoice ${invoice.invoice_number} email sent to ${customer.billing_email}`);
            } else {
              console.warn(`[Cron] Invoice ${invoice.invoice_number} email failed: ${emailResult.error}. Invoice remains as draft.`);
            }
          }
        } catch (emailErr) {
          console.warn(
            `[Cron] Email failed for invoice ${invoice.invoice_number} (non-blocking):`,
            emailErr instanceof Error ? emailErr.message : emailErr
          );
          // Invoice stays as draft — will be retried on next cron run or sent manually
        }

        // -- Sync to QuickBooks (fire-and-forget) -----------------------------
        try {
          const { syncInvoiceToQBO } = await import("@/lib/services/quickbooks.service");
          const qbResult = await syncInvoiceToQBO(invoice.id);
          if (qbResult.success) {
            stats.invoices_synced++;
            console.log(`[Cron] Invoice ${invoice.invoice_number} synced to QuickBooks`);
          } else if (qbResult.error) {
            console.warn(`[Cron] QB sync failed for ${invoice.invoice_number}: ${qbResult.error}`);
          }
        } catch (qbErr) {
          console.warn(
            `[Cron] QB sync failed for invoice ${invoice.invoice_number} (non-blocking):`,
            qbErr instanceof Error ? qbErr.message : qbErr
          );
        }

        // -- Admin notification -----------------------------------------------
        if (admins && admins.length > 0) {
          try {
            const adminNotifs = admins.map((admin) => ({
              user_id: admin.id,
              type: "invoice_sent" as const,
              title: "Invoice Auto-Generated",
              message: `Invoice ${invoice.invoice_number} for ${customer.name} — $${invoice.total.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${periodStart} to ${periodEnd})`,
              channel: "in_app" as const,
              read: false,
              read_at: null,
              data: {
                invoice_id: invoice.id,
                invoice_number: invoice.invoice_number,
                auto_generated: true,
              },
            }));

            const { error: notifErr } = await supabase.from("notifications").insert(adminNotifs);
            if (notifErr) {
              console.warn(`[Cron] Failed to create admin notification for ${invoice.invoice_number}:`, notifErr.message);
            }
          } catch (notifErr) {
            console.warn(
              `[Cron] Admin notification failed for ${invoice.invoice_number}:`,
              notifErr instanceof Error ? notifErr.message : notifErr
            );
          }
        }
      } catch (customerErr) {
        console.error(
          `[Cron] Invoice generation failed for ${customer.name}:`,
          customerErr instanceof Error ? customerErr.message : customerErr
        );
        stats.errors++;
      }
    }

    console.log(
      `[Cron] Auto-invoice completed: ${stats.invoices_generated} generated, ${stats.invoices_sent} sent, ${stats.invoices_synced} synced, ${stats.customers_skipped} skipped, ${stats.errors} errors`
    );

    return NextResponse.json({
      status: "completed",
      billing_cycles: cyclesToProcess,
      customers_processed: customers.length,
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Cron] Auto-invoice error:", err);
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
