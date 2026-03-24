import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/utils/sanitize";
import { isDemoMode } from "@/lib/demo";
import type {
  Driver,
  DriverInsert,
  DriverUpdate,
  DriverFilters,
  DriverWithCarrier,
} from "@/types/database";

export async function getAll(filters?: DriverFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_DRIVERS_WITH_CARRIER } = await import("@/lib/demo/data");
      let data = DEMO_DRIVERS_WITH_CARRIER;
      if (filters?.carrier_id) data = data.filter((d) => d.carrier_id === filters.carrier_id);
      if (filters?.status) data = data.filter((d) => d.status === filters.status);
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("drivers")
    .select("*, carrier:carriers(*)", { count: "exact" });

  if (filters?.carrier_id) query = query.eq("carrier_id", filters.carrier_id);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) {
    const safe = sanitizeSearch(filters.search);
    query = query.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }

  query = query.order("name", { ascending: true }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch drivers: ${error.message}`);

  return { data: data as DriverWithCarrier[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_DRIVERS_WITH_CARRIER } = await import("@/lib/demo/data");
      return DEMO_DRIVERS_WITH_CARRIER.find((d) => d.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("drivers")
    .select("*, carrier:carriers(*)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch driver: ${error.message}`);
  }

  return data as DriverWithCarrier;
}

export async function getByProfileId(profileId: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_DRIVERS_WITH_CARRIER } = await import("@/lib/demo/data");
      return DEMO_DRIVERS_WITH_CARRIER.find((d) => d.profile_id === profileId) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("drivers")
    .select("*, carrier:carriers(*)")
    .eq("profile_id", profileId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch driver by profile: ${error.message}`);
  }

  return data as DriverWithCarrier;
}

export async function create(input: DriverInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("drivers")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create driver: ${error.message}`);

  return data as Driver;
}

export async function update(id: string, updates: DriverUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("drivers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update driver: ${error.message}`);

  return data as Driver;
}

export async function remove(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("drivers")
    .update({ status: "inactive" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to deactivate driver: ${error.message}`);

  return data as Driver;
}
