import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type {
  Payment,
  PaymentInsert,
  PaymentUpdate,
  PaymentFilters,
  PaymentWithRelations,
} from "@/types/database";

export async function getAll(filters?: PaymentFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_PAYMENTS_WITH_RELATIONS } = await import("@/lib/demo/data");
      let data = DEMO_PAYMENTS_WITH_RELATIONS;
      if (filters?.customer_id) data = data.filter((p) => p.customer_id === filters.customer_id);
      if (filters?.invoice_id) data = data.filter((p) => p.invoice_id === filters.invoice_id);
      if (filters?.status) data = data.filter((p) => p.status === filters.status);
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("payments")
    .select("*, invoice:invoices(*), customer:customers(*)", { count: "exact" });

  if (filters?.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters?.invoice_id) query = query.eq("invoice_id", filters.invoice_id);
  if (filters?.status) query = query.eq("status", filters.status);

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch payments: ${error.message}`);

  return { data: data as PaymentWithRelations[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_PAYMENTS_WITH_RELATIONS } = await import("@/lib/demo/data");
      return DEMO_PAYMENTS_WITH_RELATIONS.find((p) => p.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("payments")
    .select("*, invoice:invoices(*), customer:customers(*)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch payment: ${error.message}`);
  }

  return data as PaymentWithRelations;
}

export async function create(input: PaymentInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("payments")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create payment: ${error.message}`);

  return data as Payment;
}

export async function update(id: string, updates: PaymentUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("payments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update payment: ${error.message}`);

  return data as Payment;
}

/**
 * Record a payment as completed and update the related invoice.
 */
export async function recordPayment(
  id: string,
  paidAt: string = new Date().toISOString()
) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  // Update payment status
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .update({
      status: "completed",
      paid_at: paidAt,
      recorded_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, invoice:invoices(*)")
    .single();

  if (paymentError) throw new Error(`Failed to record payment: ${paymentError.message}`);

  // Check if invoice is fully paid
  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", payment.invoice_id)
    .eq("status", "completed");

  if (payments && payment.invoice_id) {
    const totalPaid = payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    const invoiceTotal = (payment as PaymentWithRelations).invoice?.total ?? 0;

    if (totalPaid >= invoiceTotal) {
      await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: paidAt })
        .eq("id", payment.invoice_id);
    }
  }

  return payment as Payment;
}
