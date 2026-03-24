import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch } from "@/lib/utils/sanitize";
import { isDemoMode } from "@/lib/demo";
import type {
  Customer,
  CustomerInsert,
  CustomerUpdate,
  CustomerFilters,
} from "@/types/database";

export async function getAll(filters?: CustomerFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_CUSTOMERS } = await import("@/lib/demo/data");
      return { data: DEMO_CUSTOMERS, count: DEMO_CUSTOMERS.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) {
    const safe = sanitizeSearch(filters.search);
    query = query.or(`name.ilike.%${safe}%,billing_email.ilike.%${safe}%`);
  }

  query = query.order("name", { ascending: true }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch customers: ${error.message}`);

  return { data: data as Customer[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_CUSTOMERS } = await import("@/lib/demo/data");
      return DEMO_CUSTOMERS.find((c) => c.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch customer: ${error.message}`);
  }

  return data as Customer;
}

export async function create(input: CustomerInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("customers")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create customer: ${error.message}`);

  return data as Customer;
}

export async function update(id: string, updates: CustomerUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update customer: ${error.message}`);

  return data as Customer;
}

export async function remove(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  // Soft delete — set status to inactive
  const { data, error } = await supabase
    .from("customers")
    .update({ status: "inactive" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to deactivate customer: ${error.message}`);

  return data as Customer;
}
