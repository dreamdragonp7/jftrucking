import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type {
  Site,
  SiteInsert,
  SiteUpdate,
  SiteFilters,
  SiteWithCustomer,
} from "@/types/database";

export async function getAll(filters?: SiteFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_SITES_WITH_CUSTOMER } = await import("@/lib/demo/data");
      let data = DEMO_SITES_WITH_CUSTOMER;
      if (filters?.type) data = data.filter((s) => s.type === filters.type);
      if (filters?.customer_id) data = data.filter((s) => s.customer_id === filters.customer_id);
      if (filters?.status) data = data.filter((s) => s.status === filters.status);
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("sites")
    .select("*, customer:customers(*)", { count: "exact" });

  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.customer_id) query = query.eq("customer_id", filters.customer_id);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);
  }

  query = query.order("name", { ascending: true }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch sites: ${error.message}`);

  return { data: data as SiteWithCustomer[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_SITES_WITH_CUSTOMER } = await import("@/lib/demo/data");
      return DEMO_SITES_WITH_CUSTOMER.find((s) => s.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("sites")
    .select("*, customer:customers(*)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch site: ${error.message}`);
  }

  return data as SiteWithCustomer;
}

export async function create(input: SiteInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("sites")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create site: ${error.message}`);

  return data as Site;
}

export async function update(id: string, updates: SiteUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("sites")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update site: ${error.message}`);

  return data as Site;
}

export async function remove(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("sites")
    .update({ status: "inactive" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to deactivate site: ${error.message}`);

  return data as Site;
}
