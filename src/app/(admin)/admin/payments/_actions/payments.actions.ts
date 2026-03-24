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

    // Determine invoice status: compare total payments against invoice total
    const invoiceTotal = Number(invoice.total ?? invoice.subtotal ?? 0);
    // Sum existing payments for this invoice (including the one we just created)
    const { createAdminClient: createAdmin } = await import("@/lib/supabase/admin");
    const sb = createAdmin();
    let totalPaid = input.amount;
    if (sb) {
      const { data: existingPayments } = await sb
        .from("payments")
        .select("amount")
        .eq("invoice_id", input.invoiceId);
      totalPaid = (existingPayments ?? []).reduce(
        (sum: number, p: { amount: number | null }) => sum + Number(p.amount ?? 0),
        0
      );
    }
    const newStatus = totalPaid >= invoiceTotal ? "paid" as const : "partially_paid" as const;
    await invoicesData.update(input.invoiceId, {
      status: newStatus,
      paid_at: newStatus === "paid" ? input.paidAt : null,
    });

    // Sync to QB (non-blocking)
    let qbInvoiceId = invoice.qb_invoice_id;
    try {
      const { syncInvoiceToQBO } = await import(
        "@/lib/services/quickbooks.service"
      );
      // If invoice is not yet in QB, sync it
      if (!qbInvoiceId) {
        const syncResult = await syncInvoiceToQBO(input.invoiceId);
        if (syncResult.success && syncResult.qbInvoiceId) {
          qbInvoiceId = syncResult.qbInvoiceId;
        }
      }
    } catch (qbErr) {
      console.error("[Payment] QB invoice sync failed:", qbErr instanceof Error ? qbErr.message : qbErr);
    }

    // Create QBO Payment linked to QBO Invoice (non-blocking)
    try {
      const { getQBClient } = await import(
        "@/lib/services/quickbooks.service"
      );
      const qbClient = await getQBClient();
      if (qbClient && qbInvoiceId) {
        // Re-fetch customer for qb_customer_id
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminSb = createAdminClient();
        const { data: customer } = await adminSb!
          .from("customers")
          .select("qb_customer_id")
          .eq("id", invoice.customer_id)
          .single();

        if (customer?.qb_customer_id) {
          const qbPayment = {
            CustomerRef: { value: customer.qb_customer_id },
            TotalAmt: input.amount,
            Line: [
              {
                Amount: input.amount,
                LinkedTxn: [
                  { TxnId: qbInvoiceId, TxnType: "Invoice" },
                ],
              },
            ],
          };
          const result = await qbClient.createPayment(qbPayment);
          if (result?.Id) {
            await adminSb!
              .from("payments")
              .update({ qb_payment_id: String(result.Id) })
              .eq("id", payment.id);
          }
        }
      }
    } catch (qbErr) {
      console.warn("[Payment] QBO payment sync failed (non-critical):", qbErr);
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
