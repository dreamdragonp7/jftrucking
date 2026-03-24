import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type {
  Dispatch,
  DispatchInsert,
  DispatchUpdate,
  DispatchFilters,
  DispatchWithRelations,
} from "@/types/database";

const DISPATCH_RELATIONS = `
  *,
  order:orders(*),
  carrier:carriers(*),
  driver:drivers(*),
  truck:trucks(*),
  material:materials(*),
  pickup_site:sites!dispatches_pickup_site_id_fkey(*),
  delivery_site:sites!dispatches_delivery_site_id_fkey(*),
  purchase_order:purchase_orders(*)
`;

export async function getAll(filters?: DispatchFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_DISPATCHES_WITH_RELATIONS } = await import("@/lib/demo/data");
      let data = DEMO_DISPATCHES_WITH_RELATIONS;
      if (filters?.carrier_id) data = data.filter((d) => d.carrier_id === filters.carrier_id);
      if (filters?.driver_id) data = data.filter((d) => d.driver_id === filters.driver_id);
      if (filters?.status) data = data.filter((d) => d.status === filters.status);
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("dispatches")
    .select(DISPATCH_RELATIONS, { count: "exact" });

  if (filters?.carrier_id) query = query.eq("carrier_id", filters.carrier_id);
  if (filters?.driver_id) query = query.eq("driver_id", filters.driver_id);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.scheduled_date?.from) {
    query = query.gte("scheduled_date", filters.scheduled_date.from);
  }
  if (filters?.scheduled_date?.to) {
    query = query.lte("scheduled_date", filters.scheduled_date.to);
  }

  query = query.order("scheduled_date", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch dispatches: ${error.message}`);

  return { data: data as DispatchWithRelations[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_DISPATCHES_WITH_RELATIONS } = await import("@/lib/demo/data");
      return DEMO_DISPATCHES_WITH_RELATIONS.find((d) => d.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("dispatches")
    .select(DISPATCH_RELATIONS)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch dispatch: ${error.message}`);
  }

  return data as DispatchWithRelations;
}

/**
 * Get active dispatches for a specific driver (for the trucker portal).
 */
export async function getForDriver(driverId: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_DISPATCHES_WITH_RELATIONS } = await import("@/lib/demo/data");
      const activeStatuses = ["scheduled", "dispatched", "acknowledged", "in_progress"];
      return DEMO_DISPATCHES_WITH_RELATIONS.filter(
        (d) => d.driver_id === driverId && activeStatuses.includes(d.status)
      );
    }
    return [];
  }

  const { data, error } = await supabase
    .from("dispatches")
    .select(DISPATCH_RELATIONS)
    .eq("driver_id", driverId)
    .in("status", ["scheduled", "dispatched", "acknowledged", "in_progress"])
    .order("scheduled_date", { ascending: true });

  if (error) throw new Error(`Failed to fetch driver dispatches: ${error.message}`);

  return data as DispatchWithRelations[];
}

/**
 * Get dispatches for today's dispatch board.
 */
export async function getForDate(date: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_DISPATCHES_WITH_RELATIONS } = await import("@/lib/demo/data");
      return DEMO_DISPATCHES_WITH_RELATIONS.filter(
        (d) => d.scheduled_date === date && d.status !== "cancelled"
      );
    }
    return [];
  }

  const { data, error } = await supabase
    .from("dispatches")
    .select(DISPATCH_RELATIONS)
    .eq("scheduled_date", date)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch dispatches for date: ${error.message}`);

  return data as DispatchWithRelations[];
}

export async function create(input: DispatchInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("dispatches")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create dispatch: ${error.message}`);

  return data as Dispatch;
}

export async function update(id: string, updates: DispatchUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("dispatches")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update dispatch: ${error.message}`);

  return data as Dispatch;
}

export async function remove(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("dispatches")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to cancel dispatch: ${error.message}`);

  return data as Dispatch;
}
