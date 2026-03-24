import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type {
  PurchaseOrder,
  PurchaseOrderInsert,
  PurchaseOrderUpdate,
  PurchaseOrderFilters,
  PurchaseOrderWithRelations,
} from "@/types/database";

export async function getAll(filters?: PurchaseOrderFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_PURCHASE_ORDERS_WITH_RELATIONS } = await import("@/lib/demo/data");
      let data = DEMO_PURCHASE_ORDERS_WITH_RELATIONS;
      if (filters?.customer_id) data = data.filter((p) => p.customer_id === filters.customer_id);
      if (filters?.status) data = data.filter((p) => p.status === filters.status);
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        data = data.filter((p) => p.po_number.toLowerCase().includes(s));
      }
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("purchase_orders")
    .select(
      "*, customer:customers(*), material:materials(*), delivery_site:sites(*)",
      { count: "exact" }
    );

  if (filters?.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) {
    query = query.ilike("po_number", `%${filters.search}%`);
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch purchase orders: ${error.message}`);

  return { data: data as PurchaseOrderWithRelations[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_PURCHASE_ORDERS_WITH_RELATIONS } = await import("@/lib/demo/data");
      return DEMO_PURCHASE_ORDERS_WITH_RELATIONS.find((p) => p.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*, customer:customers(*), material:materials(*), delivery_site:sites(*)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch purchase order: ${error.message}`);
  }

  return data as PurchaseOrderWithRelations;
}

export async function create(input: PurchaseOrderInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("purchase_orders")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create purchase order: ${error.message}`);

  return data as PurchaseOrder;
}

export async function update(id: string, updates: PurchaseOrderUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("purchase_orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update purchase order: ${error.message}`);

  return data as PurchaseOrder;
}

export async function remove(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("purchase_orders")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to cancel purchase order: ${error.message}`);

  return data as PurchaseOrder;
}

/**
 * Get active POs for a customer that still have remaining quantity.
 */
export async function getActiveForCustomer(customerId: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_PURCHASE_ORDERS_WITH_RELATIONS } = await import("@/lib/demo/data");
      return DEMO_PURCHASE_ORDERS_WITH_RELATIONS.filter(
        (p) => p.customer_id === customerId && p.status === "active"
      );
    }
    return [];
  }

  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*, material:materials(*), delivery_site:sites(*)")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch active POs: ${error.message}`);

  return data as PurchaseOrderWithRelations[];
}
