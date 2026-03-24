import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type {
  Rate,
  RateInsert,
  RateUpdate,
  RateFilters,
} from "@/types/database";

export interface RateWithRelations extends Rate {
  customer: { id: string; name: string } | null;
  carrier: { id: string; name: string } | null;
  material: { id: string; name: string; unit_of_measure: string };
  pickup_site: { id: string; name: string } | null;
  delivery_site: { id: string; name: string } | null;
}

export async function getAll(filters?: RateFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_RATES_WITH_RELATIONS } = await import("@/lib/demo/data");
      let data = DEMO_RATES_WITH_RELATIONS;
      if (filters?.type) data = data.filter((r) => r.type === filters.type);
      if (filters?.customer_id) data = data.filter((r) => r.customer_id === filters.customer_id);
      if (filters?.carrier_id) data = data.filter((r) => r.carrier_id === filters.carrier_id);
      if (filters?.material_id) data = data.filter((r) => r.material_id === filters.material_id);
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("rates")
    .select(
      "*, customer:customers(id, name), carrier:carriers(id, name), material:materials(id, name, unit_of_measure), pickup_site:sites!rates_pickup_site_id_fkey(id, name), delivery_site:sites!rates_delivery_site_id_fkey(id, name)",
      { count: "exact" }
    );

  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters?.carrier_id) query = query.eq("carrier_id", filters.carrier_id);
  if (filters?.material_id) query = query.eq("material_id", filters.material_id);
  if (filters?.active_only) {
    const today = new Date().toISOString().split("T")[0];
    query = query
      .lte("effective_date", today)
      .or(`expiration_date.is.null,expiration_date.gte.${today}`);
  }

  query = query
    .order("effective_date", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch rates: ${error.message}`);

  return { data: data as RateWithRelations[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_RATES_WITH_RELATIONS } = await import("@/lib/demo/data");
      return DEMO_RATES_WITH_RELATIONS.find((r) => r.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("rates")
    .select(
      "*, customer:customers(id, name), carrier:carriers(id, name), material:materials(id, name, unit_of_measure), pickup_site:sites!rates_pickup_site_id_fkey(id, name), delivery_site:sites!rates_delivery_site_id_fkey(id, name)"
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch rate: ${error.message}`);
  }

  return data as RateWithRelations;
}

export async function create(input: RateInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("rates")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create rate: ${error.message}`);

  return data as Rate;
}

export async function update(id: string, updates: RateUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("rates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update rate: ${error.message}`);

  return data as Rate;
}

export async function deactivate(id: string) {
  const today = new Date().toISOString().split("T")[0];
  return update(id, { expiration_date: today });
}

export async function remove(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.from("rates").delete().eq("id", id);

  if (error) throw new Error(`Failed to delete rate: ${error.message}`);
}
