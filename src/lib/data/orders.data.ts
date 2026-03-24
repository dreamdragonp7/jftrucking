import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type {
  Order,
  OrderInsert,
  OrderUpdate,
  OrderFilters,
  OrderWithRelations,
} from "@/types/database";

export async function getAll(filters?: OrderFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_ORDERS_WITH_RELATIONS } = await import("@/lib/demo/data");
      let data = DEMO_ORDERS_WITH_RELATIONS;
      if (filters?.customer_id) data = data.filter((o) => o.customer_id === filters.customer_id);
      if (filters?.status) data = data.filter((o) => o.status === filters.status);
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("orders")
    .select(
      "*, customer:customers(*), purchase_order:purchase_orders(*), material:materials(*), pickup_site:sites!orders_pickup_site_id_fkey(*), delivery_site:sites!orders_delivery_site_id_fkey(*)",
      { count: "exact" }
    );

  if (filters?.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.scheduled_date?.from) {
    query = query.gte("scheduled_date", filters.scheduled_date.from);
  }
  if (filters?.scheduled_date?.to) {
    query = query.lte("scheduled_date", filters.scheduled_date.to);
  }

  query = query.order("scheduled_date", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);

  return { data: data as OrderWithRelations[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_ORDERS_WITH_RELATIONS } = await import("@/lib/demo/data");
      return DEMO_ORDERS_WITH_RELATIONS.find((o) => o.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, customer:customers(*), purchase_order:purchase_orders(*), material:materials(*), pickup_site:sites!orders_pickup_site_id_fkey(*), delivery_site:sites!orders_delivery_site_id_fkey(*)"
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch order: ${error.message}`);
  }

  return data as OrderWithRelations;
}

export async function create(input: OrderInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("orders")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create order: ${error.message}`);

  return data as Order;
}

export async function update(id: string, updates: OrderUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update order: ${error.message}`);

  return data as Order;
}

export async function remove(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to cancel order: ${error.message}`);

  return data as Order;
}
