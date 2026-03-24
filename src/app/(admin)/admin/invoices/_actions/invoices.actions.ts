"use server";

import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { requireRole } from "@/lib/supabase/auth";
import * as invoicesData from "@/lib/data/invoices.data";
import * as notificationsData from "@/lib/data/notifications.data";
import {
  previewInvoice,
  generateInvoice,
  getInvoiceWithDetails,
  type InvoicePreview,
} from "@/lib/services/invoice.service";
import { sendInvoiceEmail } from "@/lib/services/email.service";
import { InvoicePDF } from "@/lib/pdf/invoice-template";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type { Invoice, InvoiceWithLineItems, InvoiceWithDetails } from "@/types/database";

// ---------------------------------------------------------------------------
// Preview invoice — shows what will be generated
// ---------------------------------------------------------------------------

export async function previewInvoiceAction(
  customerId: string,
  periodStart: string,
  periodEnd: string,
  poIds?: string[]
): Promise<ActionResult<InvoicePreview>> {
  try {
    await requireRole("admin");
    const preview = await previewInvoice(
      customerId,
      periodStart,
      periodEnd,
      poIds
    );
    return ok(preview);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Generate invoice — creates it in the DB
// ---------------------------------------------------------------------------

export async function generateInvoiceAction(
  customerId: string,
  periodStart: string,
  periodEnd: string,
  poIds?: string[]
): Promise<ActionResult<InvoiceWithLineItems>> {
  try {
    const auth = await requireRole("admin");
    const invoice = await generateInvoice(
      customerId,
      periodStart,
      periodEnd,
      poIds
    );

    // Update created_by
    await invoicesData.update(invoice.id, { created_by: auth.user.id });

    revalidatePath("/admin/invoices");
    revalidatePath("/customer/invoices");

    return ok(invoice);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Send invoice — generates PDF, sends email, updates status
// ---------------------------------------------------------------------------

export async function sendInvoiceAction(
  invoiceId: string
): Promise<ActionResult<{ sent: boolean; emailError?: string }>> {
  try {
    await requireRole("admin");

    // Get full invoice with details
    const invoice = await getInvoiceWithDetails(invoiceId);
    if (!invoice) return fail("Invoice not found");

    if (invoice.status !== "draft" && invoice.status !== "sent") {
      return fail("Only draft or sent invoices can be sent");
    }

    // Generate PDF buffer
    const pdfElement = React.createElement(InvoicePDF, { invoice });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(pdfElement as any);

    // Send email with PDF attachment
    const emailResult = await sendInvoiceEmail(invoice, pdfBuffer);

    // Only update invoice status to 'sent' if email succeeded
    if (emailResult.success) {
      const now = new Date().toISOString();
      await invoicesData.update(invoiceId, {
        status: "sent",
        sent_at: now,
      });
    }

    // Sync to QuickBooks if connected (non-blocking — don't fail the send)
    try {
      const { syncInvoiceToQBO } = await import(
        "@/lib/services/quickbooks.service"
      );
      const qbResult = await syncInvoiceToQBO(invoiceId);
      if (qbResult.success && qbResult.qbInvoiceId) {
        await invoicesData.update(invoiceId, {
          qb_invoice_id: qbResult.qbInvoiceId,
        });
      }
    } catch (qbErr) {
      console.error("[Invoice] QB sync failed:", qbErr instanceof Error ? qbErr.message : qbErr);
    }

    // Create in-app notification for the customer's portal users
    try {
      const supabase = (await requireRole("admin")).supabase;
      const { data: customerProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_name", invoice.customer.name)
        .eq("role", "customer")
        .eq("status", "active");

      if (customerProfiles && customerProfiles.length > 0) {
        const notifications = customerProfiles.map((profile) => ({
          user_id: profile.id,
          type: "invoice_sent" as const,
          title: "New Invoice",
          message: `Invoice ${invoice.invoice_number} for $${invoice.total.toLocaleString("en-US", { minimumFractionDigits: 2 })} is ready. Due: ${new Date(invoice.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
          channel: "in_app" as const,
          read: false,
          read_at: null,
          data: { invoice_id: invoiceId, invoice_number: invoice.invoice_number },
        }));
        await notificationsData.createBulk(notifications);
      }
    } catch (notifErr) {
      console.warn("[Invoice] Failed to send customer notification:", notifErr instanceof Error ? notifErr.message : notifErr);
    }

    revalidatePath("/admin/invoices");
    revalidatePath("/customer/invoices");

    return ok({
      sent: true,
      emailError: emailResult.success ? undefined : emailResult.error,
    });
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Delete invoice — only drafts
// ---------------------------------------------------------------------------

export async function deleteInvoiceAction(
  invoiceId: string
): Promise<ActionResult<void>> {
  try {
    await requireRole("admin");

    const invoice = await invoicesData.getById(invoiceId);
    if (!invoice) return fail("Invoice not found");

    if (invoice.status !== "draft") {
      return fail("Only draft invoices can be deleted");
    }

    // Soft delete by cancelling
    await invoicesData.remove(invoiceId);

    revalidatePath("/admin/invoices");
    revalidatePath("/customer/invoices");

    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Mark invoice as paid — manual payment recording
// ---------------------------------------------------------------------------

export async function markInvoicePaidAction(
  invoiceId: string,
  paidAt: string,
  paymentMethod: string
): Promise<ActionResult<Invoice>> {
  try {
    await requireRole("admin");

    const invoice = await invoicesData.getById(invoiceId);
    if (!invoice) return fail("Invoice not found");

    if (invoice.status === "paid") {
      return fail("Invoice is already paid");
    }

    const updated = await invoicesData.update(invoiceId, {
      status: "paid",
      paid_at: paidAt || new Date().toISOString(),
    });

    // Notify customer
    try {
      const supabase = (await requireRole("admin")).supabase;
      const fullInvoice = await getInvoiceWithDetails(invoiceId);
      if (fullInvoice) {
        const { data: customerProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("company_name", fullInvoice.customer.name)
          .eq("role", "customer")
          .eq("status", "active");

        if (customerProfiles && customerProfiles.length > 0) {
          const notifications = customerProfiles.map((profile) => ({
            user_id: profile.id,
            type: "payment_received" as const,
            title: "Payment Received",
            message: `Payment received for invoice ${invoice.invoice_number}. Thank you!`,
            channel: "in_app" as const,
            read: false,
            read_at: null,
            data: { invoice_id: invoiceId },
          }));
          await notificationsData.createBulk(notifications);
        }
      }
    } catch (notifErr) {
      console.warn("[Invoice] Failed to send payment received notification:", notifErr instanceof Error ? notifErr.message : notifErr);
    }

    revalidatePath("/admin/invoices");
    revalidatePath("/customer/invoices");
    revalidatePath("/customer/payments");

    return ok(updated);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Resend invoice — resends email
// ---------------------------------------------------------------------------

export async function resendInvoiceAction(
  invoiceId: string
): Promise<ActionResult<{ sent: boolean; emailError?: string }>> {
  try {
    await requireRole("admin");

    const invoice = await getInvoiceWithDetails(invoiceId);
    if (!invoice) return fail("Invoice not found");

    if (invoice.status === "draft") {
      return fail("Cannot resend a draft invoice. Send it first.");
    }

    // Generate PDF buffer
    const pdfElement = React.createElement(InvoicePDF, { invoice });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(pdfElement as any);

    // Send email
    const emailResult = await sendInvoiceEmail(invoice, pdfBuffer);

    // Update sent_at timestamp
    await invoicesData.update(invoiceId, {
      sent_at: new Date().toISOString(),
    });

    revalidatePath("/admin/invoices");

    return ok({
      sent: true,
      emailError: emailResult.success ? undefined : emailResult.error,
    });
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Get invoice details — for the detail page
// ---------------------------------------------------------------------------

export async function getInvoiceDetailsAction(
  invoiceId: string
): Promise<ActionResult<InvoiceWithDetails>> {
  try {
    await requireRole("admin");
    const invoice = await getInvoiceWithDetails(invoiceId);
    if (!invoice) return fail("Invoice not found");
    return ok(invoice);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// List invoices — for admin table
// ---------------------------------------------------------------------------

export async function getInvoicesAction(
  filters?: {
    status?: string;
    customer_id?: string;
  }
): Promise<ActionResult<{ data: (Invoice & { customer: { name: string } })[]; count: number }>> {
  try {
    await requireRole("admin");
    const result = await invoicesData.getAll({
      status: filters?.status as Invoice["status"] | undefined,
      customer_id: filters?.customer_id,
      limit: 100,
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Get customers for the generate dialog
// ---------------------------------------------------------------------------

export async function getCustomersForInvoiceAction(): Promise<
  ActionResult<{ id: string; name: string; payment_terms: string }[]>
> {
  try {
    const auth = await requireRole("admin");
    const { data, error } = await auth.supabase
      .from("customers")
      .select("id, name, payment_terms")
      .eq("status", "active")
      .order("name");

    if (error) throw new Error(error.message);
    return ok(data ?? []);
  } catch (error) {
    return fail(error);
  }
}
