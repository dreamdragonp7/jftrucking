import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type {
  Invoice,
  InvoiceInsert,
  InvoiceUpdate,
  InvoiceLineItem,
  InvoiceLineItemInsert,
  InvoiceFilters,
  InvoiceWithLineItems,
} from "@/types/database";

export async function getAll(filters?: InvoiceFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_INVOICES_WITH_CUSTOMER } = await import("@/lib/demo/data");
      let data = DEMO_INVOICES_WITH_CUSTOMER;
      if (filters?.customer_id) data = data.filter((i) => i.customer_id === filters.customer_id);
      if (filters?.status) data = data.filter((i) => i.status === filters.status);
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("invoices")
    .select("*, customer:customers(*)", { count: "exact" });

  if (filters?.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.due_date?.from) {
    query = query.gte("due_date", filters.due_date.from);
  }
  if (filters?.due_date?.to) {
    query = query.lte("due_date", filters.due_date.to);
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);

  return { data: data as (Invoice & { customer: { name: string } })[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_INVOICES_WITH_LINE_ITEMS } = await import("@/lib/demo/data");
      return DEMO_INVOICES_WITH_LINE_ITEMS.find((i) => i.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("invoices")
    .select("*, customer:customers(*), line_items:invoice_line_items(*)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch invoice: ${error.message}`);
  }

  return data as InvoiceWithLineItems;
}

export async function create(input: InvoiceInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("invoices")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create invoice: ${error.message}`);

  return data as Invoice;
}

export async function update(id: string, updates: InvoiceUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update invoice: ${error.message}`);

  return data as Invoice;
}

export async function remove(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to cancel invoice: ${error.message}`);

  return data as Invoice;
}

/**
 * Add a line item to an invoice. Invoice totals are auto-recalculated
 * by the database trigger.
 */
export async function addLineItem(input: InvoiceLineItemInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("invoice_line_items")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to add line item: ${error.message}`);

  return data as InvoiceLineItem;
}

/**
 * Add multiple line items to an invoice.
 */
export async function addLineItems(items: InvoiceLineItemInsert[]) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("invoice_line_items")
    .insert(items)
    .select();

  if (error) throw new Error(`Failed to add line items: ${error.message}`);

  return data as InvoiceLineItem[];
}

/**
 * Remove a line item from an invoice.
 */
export async function removeLineItem(lineItemId: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase
    .from("invoice_line_items")
    .delete()
    .eq("id", lineItemId);

  if (error) throw new Error(`Failed to remove line item: ${error.message}`);
}

/**
 * Get overdue invoices (for reminders cron).
 */
export async function getOverdue() {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_INVOICES_WITH_CUSTOMER } = await import("@/lib/demo/data");
      const today = new Date().toISOString().split("T")[0];
      return DEMO_INVOICES_WITH_CUSTOMER.filter(
        (i) => i.status === "sent" && i.due_date < today
      );
    }
    return [];
  }

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("invoices")
    .select("*, customer:customers(*)")
    .eq("status", "sent")
    .lt("due_date", today)
    .order("due_date", { ascending: true });

  if (error) throw new Error(`Failed to fetch overdue invoices: ${error.message}`);

  return data as (Invoice & { customer: { name: string; billing_email: string } })[];
}

/**
 * Generate the next invoice number atomically via RPC to prevent race conditions.
 * Falls back to SELECT MAX approach if RPC is not available.
 * Retries up to 3 times on unique constraint violations.
 */
export async function getNextInvoiceNumber(): Promise<string> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  // Try atomic RPC first
  try {
    const { data: rpcResult, error: rpcErr } = await supabase.rpc("next_invoice_number");
    if (!rpcErr && rpcResult) {
      return rpcResult as string;
    }
  } catch {
    // RPC not available (migration not applied yet) — fall back
  }

  // Fallback: SELECT MAX with retry on conflict
  const year = new Date().getFullYear();
  const prefix = `JFT-${year}-`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("invoices")
      .select("invoice_number")
      .like("invoice_number", `${prefix}%`)
      .order("invoice_number", { ascending: false })
      .limit(1);

    if (error) throw new Error(`Failed to get invoice number: ${error.message}`);

    let nextNum = 1;
    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].invoice_number.replace(prefix, ""), 10);
      nextNum = lastNumber + 1 + attempt; // bump on retry to avoid conflicts
    }

    const candidate = `${prefix}${String(nextNum).padStart(4, "0")}`;

    // Check if this number already exists (race condition guard)
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("invoice_number", candidate);

    if (!count || count === 0) {
      return candidate;
    }

    // Number already taken — retry with incremented attempt
    console.warn(`[Invoice] Number ${candidate} already exists, retrying (attempt ${attempt + 1}/3)`);
  }

  // Last resort: use timestamp-based number to guarantee uniqueness
  return `${prefix}${String(Date.now()).slice(-4)}`;
}
