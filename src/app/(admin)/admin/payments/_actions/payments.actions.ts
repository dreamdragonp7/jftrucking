"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import * as paymentsData from "@/lib/data/payments.data";
import * as invoicesData from "@/lib/data/invoices.data";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type {
  Payment,
  PaymentWithRelations,
  PaymentMethod,
  CarrierSettlement,
} from "@/types/database";

// ---------------------------------------------------------------------------
// List payments
// ---------------------------------------------------------------------------

export async function getPaymentsAction(
  filters?: { status?: string; customer_id?: string }
): Promise<
  ActionResult<{ data: PaymentWithRelations[]; count: number }>
> {
  try {
    await requireRole("admin");
    const result = await paymentsData.getAll({
      status: filters?.status as Payment["status"] | undefined,
      customer_id: filters?.customer_id,
      limit: 100,
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Get payment detail
// ---------------------------------------------------------------------------

export async function getPaymentDetailAction(
  paymentId: string
): Promise<ActionResult<PaymentWithRelations>> {
  try {
    await requireRole("admin");
    const payment = await paymentsData.getById(paymentId);
    if (!payment) return fail("Payment not found");
    return ok(payment);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Record manual payment (admin marks an invoice as paid)
// ---------------------------------------------------------------------------

export async function recordManualPaymentAction(input: {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidAt: string;
  referenceNumber?: string;
}): Promise<ActionResult<Payment>> {
  try {
    const auth = await requireRole("admin");

    // Verify invoice exists
    const invoice = await invoicesData.getById(input.invoiceId);
    if (!invoice) return fail("Invoice not found");

    if (invoice.status === "paid") {
      return fail("Invoice is already fully paid");
    }

    // Create payment record
    const payment = await paymentsData.create({
      invoice_id: input.invoiceId,
      customer_id: invoice.customer_id,
      amount: input.amount,
      payment_method: input.paymentMethod,
      status: "completed" as const,
      paid_at: input.paidAt,
      recorded_at: new Date().toISOString(),
      ach_transaction_id: input.referenceNumber ?? null,
      qb_payment_id: null,
      failure_reason: null,
    });

    // Update invoice status
    const newStatus = "paid" as const; // Simplified: any payment marks the invoice as paid
    await invoicesData.update(input.invoiceId, {
      status: newStatus,
      paid_at: newStatus === "paid" ? input.paidAt : null,
    });

    // Sync to QB (non-blocking)
    try {
      const { syncInvoiceToQBO } = await import(
        "@/lib/services/quickbooks.service"
      );
      // If invoice is not yet in QB, sync it
      if (!invoice.qb_invoice_id) {
        await syncInvoiceToQBO(input.invoiceId);
      }
    } catch (qbErr) {
      console.error("[Payment] QB invoice sync failed:", qbErr instanceof Error ? qbErr.message : qbErr);
    }

    revalidatePath("/admin/payments");
    revalidatePath("/admin/invoices");
    revalidatePath("/admin/dashboard");

    return ok(payment);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Get settlements for the "Sent" tab
// ---------------------------------------------------------------------------

export async function getSettlementPaymentsAction(): Promise<
  ActionResult<(CarrierSettlement & { carrier: { name: string } })[]>
> {
  try {
    const auth = await requireRole("admin");

    const { data, error } = await auth.supabase
      .from("carrier_settlements")
      .select("*, carrier:carriers(name)")
      .in("status", ["approved", "paid"])
      .order("period_end", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return ok((data ?? []) as (CarrierSettlement & { carrier: { name: string } })[]);
  } catch (error) {
    return fail(error);
  }
}
