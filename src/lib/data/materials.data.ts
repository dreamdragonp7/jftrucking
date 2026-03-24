import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type {
  Material,
  MaterialInsert,
  MaterialUpdate,
} from "@/types/database";

export async function getAll(filters?: { status?: string }) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_MATERIALS } = await import("@/lib/demo/data");
      let data = DEMO_MATERIALS;
      if (filters?.status) data = data.filter((m) => m.status === filters.status);
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  let query = supabase
    .from("materials")
    .select("*", { count: "exact" });

  if (filters?.status) query = query.eq("status", filters.status);

  query = query.order("name", { ascending: true });

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch materials: ${error.message}`);

  return { data: data as Material[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_MATERIALS } = await import("@/lib/demo/data");
      return DEMO_MATERIALS.find((m) => m.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch material: ${error.message}`);
  }

  return data as Material;
}

export async function create(input: MaterialInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("materials")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create material: ${error.message}`);

  return data as Material;
}

export async function update(id: string, updates: MaterialUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("materials")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update material: ${error.message}`);

  return data as Material;
}

export async function remove(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("materials")
    .update({ status: "inactive" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to deactivate material: ${error.message}`);

  return data as Material;
}
