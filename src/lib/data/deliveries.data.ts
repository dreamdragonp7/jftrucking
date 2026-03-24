import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type {
  Delivery,
  DeliveryInsert,
  DeliveryUpdate,
  DeliveryFilters,
  DeliveryWithRelations,
} from "@/types/database";

const DELIVERY_RELATIONS = `
  *,
  dispatch:dispatches(*),
  driver:drivers(*),
  truck:trucks(*),
  material:materials(*),
  delivery_site:sites(*)
`;

export async function getAll(filters?: DeliveryFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_DELIVERIES_WITH_RELATIONS } = await import("@/lib/demo/data");
      let data = DEMO_DELIVERIES_WITH_RELATIONS;
      if (filters?.driver_id) data = data.filter((d) => d.driver_id === filters.driver_id);
      if (filters?.dispatch_id) data = data.filter((d) => d.dispatch_id === filters.dispatch_id);
      if (filters?.confirmation_status) data = data.filter((d) => d.confirmation_status === filters.confirmation_status);
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("deliveries")
    .select(DELIVERY_RELATIONS, { count: "exact" });

  if (filters?.driver_id) query = query.eq("driver_id", filters.driver_id);
  if (filters?.dispatch_id) query = query.eq("dispatch_id", filters.dispatch_id);
  if (filters?.confirmation_status) {
    query = query.eq("confirmation_status", filters.confirmation_status);
  }
  if (filters?.delivered_at?.from) {
    query = query.gte("delivered_at", filters.delivered_at.from);
  }
  if (filters?.delivered_at?.to) {
    query = query.lte("delivered_at", filters.delivered_at.to);
  }

  query = query.order("delivered_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch deliveries: ${error.message}`);

  return { data: data as DeliveryWithRelations[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_DELIVERIES_WITH_RELATIONS } = await import("@/lib/demo/data");
      return DEMO_DELIVERIES_WITH_RELATIONS.find((d) => d.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("deliveries")
    .select(DELIVERY_RELATIONS)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch delivery: ${error.message}`);
  }

  return data as DeliveryWithRelations;
}

/**
 * Get deliveries pending confirmation for a customer.
 */
export async function getPendingForCustomer(customerId: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_DELIVERIES_WITH_RELATIONS } = await import("@/lib/demo/data");
      // In demo mode, return pending deliveries (simplified -- all belong to customer1)
      return DEMO_DELIVERIES_WITH_RELATIONS.filter(
        (d) => d.confirmation_status === "pending"
      );
    }
    return [];
  }

  const { data, error } = await supabase
    .from("deliveries")
    .select(`
      *,
      dispatch:dispatches!inner(
        *,
        purchase_order:purchase_orders!inner(customer_id)
      ),
      driver:drivers(*),
      truck:trucks(*),
      material:materials(*),
      delivery_site:sites(*)
    `)
    .eq("dispatch.purchase_order.customer_id", customerId)
    .eq("confirmation_status", "pending")
    .order("delivered_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch pending deliveries: ${error.message}`);

  return data as DeliveryWithRelations[];
}

/**
 * Get deliveries for a driver's history.
 */
export async function getForDriver(driverId: string, limit: number = 50) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_DELIVERIES_WITH_RELATIONS } = await import("@/lib/demo/data");
      return DEMO_DELIVERIES_WITH_RELATIONS
        .filter((d) => d.driver_id === driverId)
        .slice(0, limit);
    }
    return [];
  }

  const { data, error } = await supabase
    .from("deliveries")
    .select(DELIVERY_RELATIONS)
    .eq("driver_id", driverId)
    .order("delivered_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch driver deliveries: ${error.message}`);

  return data as DeliveryWithRelations[];
}

/**
 * Get disputed deliveries (for admin).
 */
export async function getDisputed() {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_DELIVERIES_WITH_RELATIONS } = await import("@/lib/demo/data");
      return DEMO_DELIVERIES_WITH_RELATIONS.filter(
        (d) => d.confirmation_status === "disputed"
      );
    }
    return [];
  }

  const { data, error } = await supabase
    .from("deliveries")
    .select(DELIVERY_RELATIONS)
    .eq("confirmation_status", "disputed")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch disputed deliveries: ${error.message}`);

  return data as DeliveryWithRelations[];
}

export async function create(input: DeliveryInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("deliveries")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create delivery: ${error.message}`);

  return data as Delivery;
}

export async function update(id: string, updates: DeliveryUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("deliveries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update delivery: ${error.message}`);

  return data as Delivery;
}

/**
 * Confirm a delivery (customer action).
 */
export async function confirm(id: string, confirmedBy: string) {
  return update(id, {
    confirmation_status: "confirmed",
    confirmed_at: new Date().toISOString(),
    confirmed_by: confirmedBy,
  });
}

/**
 * Dispute a delivery (customer action).
 */
export async function dispute(id: string, reason: string) {
  return update(id, {
    confirmation_status: "disputed",
    dispute_reason: reason,
  });
}

/**
 * Resolve a dispute (admin action).
 */
export async function resolveDispute(
  id: string,
  resolvedBy: string,
  resolution: string,
  status: "confirmed" | "disputed" = "confirmed"
) {
  return update(id, {
    confirmation_status: status,
    dispute_resolved_at: new Date().toISOString(),
    dispute_resolved_by: resolvedBy,
    dispute_resolution: resolution,
  });
}
