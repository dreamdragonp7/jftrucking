import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type {
  CarrierSettlement,
  CarrierSettlementInsert,
  CarrierSettlementUpdate,
  CarrierSettlementLine,
  CarrierSettlementLineInsert,
  SettlementFilters,
  CarrierSettlementWithLines,
} from "@/types/database";

export async function getAll(filters?: SettlementFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_SETTLEMENTS } = await import("@/lib/demo/data");
      let data = DEMO_SETTLEMENTS;
      if (filters?.carrier_id) data = data.filter((s) => s.carrier_id === filters.carrier_id);
      if (filters?.status) data = data.filter((s) => s.status === filters.status);
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("carrier_settlements")
    .select("*, carrier:carriers(*)", { count: "exact" });

  if (filters?.carrier_id) query = query.eq("carrier_id", filters.carrier_id);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.period?.from) {
    query = query.gte("period_start", filters.period.from);
  }
  if (filters?.period?.to) {
    query = query.lte("period_end", filters.period.to);
  }

  query = query.order("period_end", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch settlements: ${error.message}`);

  return { data: data as CarrierSettlement[], count: count ?? 0 };
}

export async function getById(id: string) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_SETTLEMENTS_WITH_LINES } = await import("@/lib/demo/data");
      return DEMO_SETTLEMENTS_WITH_LINES.find((s) => s.id === id) ?? null;
    }
    return null;
  }

  const { data, error } = await supabase
    .from("carrier_settlements")
    .select("*, carrier:carriers(*), lines:carrier_settlement_lines(*, delivery:deliveries(*))")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch settlement: ${error.message}`);
  }

  return data as CarrierSettlementWithLines;
}

export async function create(input: CarrierSettlementInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("carrier_settlements")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create settlement: ${error.message}`);

  return data as CarrierSettlement;
}

export async function update(id: string, updates: CarrierSettlementUpdate) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("carrier_settlements")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update settlement: ${error.message}`);

  return data as CarrierSettlement;
}

/**
 * Add settlement line items (delivery-level detail).
 */
export async function addLines(lines: CarrierSettlementLineInsert[]) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("carrier_settlement_lines")
    .insert(lines)
    .select();

  if (error) throw new Error(`Failed to add settlement lines: ${error.message}`);

  return data as CarrierSettlementLine[];
}

/**
 * Approve a settlement.
 */
export async function approve(id: string, approvedBy: string) {
  return update(id, {
    status: "approved",
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
  });
}

/**
 * Mark a settlement as paid.
 */
export async function markPaid(id: string) {
  return update(id, {
    status: "paid",
    paid_at: new Date().toISOString(),
  });
}
