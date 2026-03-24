import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/utils/sanitize";
import { isDemoMode } from "@/lib/demo";
import type {
  Carrier,
  CarrierInsert,
  CarrierUpdate,
  CarrierFilters,
} from "@/types/database";

export async function getAll(filters?: CarrierFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_CARRIERS } = await import("@/lib/demo/data");
      return { data: DEMO_CARRIERS, count: DEMO_CARRIERS.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("carriers")
    .select("*", { count: "exact" });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) {
    const safe = sanitizeSearch(filters.search);
    query = query.or(`name.ilike.%${safe}%,contact_name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }

  query = query.order("name", { ascending: true }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch carriers: ${error.message}`);

  return { data: data as Carrier[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_CARRIERS } = await import("@/lib/demo/data");
      return DEMO_CARRIERS.find((c) => c.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("carriers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch carrier: ${error.message}`);
  }

  return data as Carrier;
}

export async function create(input: CarrierInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("carriers")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create carrier: ${error.message}`);

  return data as Carrier;
}

export async function update(id: string, updates: CarrierUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("carriers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update carrier: ${error.message}`);

  return data as Carrier;
}

export async function remove(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("carriers")
    .update({ status: "inactive" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to deactivate carrier: ${error.message}`);

  return data as Carrier;
}

/**
 * Get carriers with expiring insurance (within N days).
 */
export async function getExpiringInsurance(withinDays: number = 30) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_CARRIERS } = await import("@/lib/demo/data");
      const future = new Date();
      future.setDate(future.getDate() + withinDays);
      return DEMO_CARRIERS.filter(
        (c) =>
          c.status === "active" &&
          c.insurance_expiry &&
          new Date(c.insurance_expiry) <= future
      );
    }
    return [];
  }

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + withinDays);

  const { data, error } = await supabase
    .from("carriers")
    .select("*")
    .eq("status", "active")
    .not("insurance_expiry", "is", null)
    .lte("insurance_expiry", futureDate.toISOString().split("T")[0])
    .order("insurance_expiry", { ascending: true });

  if (error) throw new Error(`Failed to fetch expiring insurance: ${error.message}`);

  return data as Carrier[];
}
