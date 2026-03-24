import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type {
  Truck,
  TruckInsert,
  TruckUpdate,
  TruckFilters,
  TruckWithCarrier,
} from "@/types/database";

export async function getAll(filters?: TruckFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_TRUCKS_WITH_CARRIER } = await import("@/lib/demo/data");
      let data = DEMO_TRUCKS_WITH_CARRIER;
      if (filters?.carrier_id) data = data.filter((t) => t.carrier_id === filters.carrier_id);
      if (filters?.status) data = data.filter((t) => t.status === filters.status);
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("trucks")
    .select("*, carrier:carriers(*)", { count: "exact" });

  if (filters?.carrier_id) query = query.eq("carrier_id", filters.carrier_id);
  if (filters?.status) query = query.eq("status", filters.status);

  query = query.order("number", { ascending: true }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch trucks: ${error.message}`);

  return { data: data as TruckWithCarrier[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_TRUCKS_WITH_CARRIER } = await import("@/lib/demo/data");
      return DEMO_TRUCKS_WITH_CARRIER.find((t) => t.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("trucks")
    .select("*, carrier:carriers(*)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch truck: ${error.message}`);
  }

  return data as TruckWithCarrier;
}

export async function create(input: TruckInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("trucks")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create truck: ${error.message}`);

  return data as Truck;
}

export async function update(id: string, updates: TruckUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("trucks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update truck: ${error.message}`);

  return data as Truck;
}

export async function remove(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("trucks")
    .update({ status: "inactive" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to deactivate truck: ${error.message}`);

  return data as Truck;
}
