import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type {
  Profile,
  ProfileUpdate,
  PaginationParams,
  UserRole,
} from "@/types/database";

export async function getAll(
  filters?: PaginationParams & { role?: UserRole; status?: string; search?: string }
) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_PROFILES } = await import("@/lib/demo/data");
      let data = DEMO_PROFILES;
      if (filters?.role) data = data.filter((p) => p.role === filters.role);
      if (filters?.status) data = data.filter((p) => p.status === filters.status);
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" });

  if (filters?.role) query = query.eq("role", filters.role);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch profiles: ${error.message}`);

  return { data: data as Profile[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_PROFILES } = await import("@/lib/demo/data");
      return DEMO_PROFILES.find((p) => p.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return data as Profile;
}

export async function update(id: string, updates: ProfileUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update profile: ${error.message}`);

  return data as Profile;
}
