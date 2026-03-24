/**
 * Settlement Service — generates carrier settlements from confirmed deliveries.
 *
 * Flow:
 * 1. generateSettlement(carrierId, periodStart, periodEnd)
 *    → Query confirmed deliveries for carrier in period
 *    → Look up carrier rates per material
 *    → Calculate hauling amount per delivery
 *    → Calculate dispatch fee (weekly amount x weeks in period)
 *    → Create settlement + settlement_lines in Supabase
 *
 * 2. getSettlementWithDetails(settlementId) — full settlement with line items
 *
 * 3. approveSettlement(settlementId, approvedBy) — mark approved, sync to QB as Bill
 *
 * 4. paySettlement(settlementId) — trigger QB Bill Pay, update status to paid
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateAmount } from "@/lib/utils/rate-calc";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CarrierSettlement,
  CarrierSettlementLine,
  CarrierSettlementWithLines,
  Carrier,
  Delivery,
  Material,
  RateType,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SettlementLinePreview {
  delivery_id: string;
  delivery_date: string;
  ticket_number: string | null;
  material_name: string;
  net_weight: number | null;
  unit: string;
  rate: number;
  amount: number;
}

export interface SettlementPreview {
  carrier: Carrier;
  period_start: string;
  period_end: string;
  lines: SettlementLinePreview[];
  hauling_amount: number;
  dispatch_fee: number;
  deductions: number;
  total_amount: number;
  delivery_count: number;
  weeks_in_period: number;
  warnings: string[];
}

export interface SettlementWithFullDetails extends CarrierSettlement {
  carrier: Carrier;
  lines: (CarrierSettlementLine & {
    delivery?: (Delivery & {
      material?: Material | null;
    }) | null;
  })[];
}

// ---------------------------------------------------------------------------
// Helper: calculate weeks in period
// ---------------------------------------------------------------------------

function weeksInPeriod(start: string, end: string): number {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T23:59:59");
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  // Round up to nearest week
  return Math.max(1, Math.ceil(diffDays / 7));
}

// ---------------------------------------------------------------------------
// Generate settlement number
// ---------------------------------------------------------------------------

async function generateSettlementNumber(supabaseClient?: SupabaseClient): Promise<string> {
  const supabase = supabaseClient ?? await createClient();
  if (!supabase) return `SET-${Date.now()}`;

  // Try atomic RPC first
  try {
    const { data: rpcResult, error: rpcErr } = await supabase.rpc("next_settlement_number");
    if (!rpcErr && rpcResult) {
      return rpcResult as string;
    }
  } catch (err) {
    // RPC not available — fall back
    console.error("[Settlement] generateSettlementNumber RPC failed:", err instanceof Error ? err.message : err);
  }

  // Fallback: count-based approach
  const { count } = await supabase
    .from("carrier_settlements")
    .select("id", { count: "exact", head: true });

  const nextNum = (count ?? 0) + 1;
  return `SET-${String(nextNum).padStart(5, "0")}`;
}

// ---------------------------------------------------------------------------
// Preview — shows admin what the settlement will contain
// ---------------------------------------------------------------------------

export async function previewSettlement(
  carrierId: string,
  periodStart: string,
  periodEnd: string,
  supabaseClient?: SupabaseClient
): Promise<SettlementPreview> {
  const supabase = supabaseClient ?? await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  // 1. Get the carrier
  const { data: carrier, error: carrierErr } = await supabase
    .from("carriers")
    .select("*")
    .eq("id", carrierId)
    .single();

  if (carrierErr || !carrier) {
    throw new Error(`Carrier not found: ${carrierErr?.message}`);
  }

  // 2. Find all confirmed deliveries for this carrier in the date range
  // Link: deliveries -> dispatches -> carrier_id
  const { data: deliveries, error: delErr } = await supabase
    .from("deliveries")
    .select(`
      id,
      delivered_at,
      ticket_number,
      net_weight,
      material_id,
      material:materials(id, name, unit_of_measure),
      dispatch:dispatches!inner(carrier_id)
    `)
    .gte("delivered_at", `${periodStart}T00:00:00`)
    .lte("delivered_at", `${periodEnd}T23:59:59`)
    .eq("confirmation_status", "confirmed");

  if (delErr) {
    throw new Error(`Failed to fetch deliveries: ${delErr.message}`);
  }

  // Filter deliveries to this carrier (the inner join on dispatches ensures carrier_id match)
  const carrierDeliveries = (deliveries ?? []).filter((d) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch = d.dispatch as any;
    return dispatch?.carrier_id === carrierId;
  });

  // 3. Look up carrier rates per material
  const { data: rates } = await supabase
    .from("rates")
    .select("*")
    .eq("type", "carrier")
    .eq("carrier_id", carrierId)
    .lte("effective_date", periodEnd)
    .or(`expiration_date.is.null,expiration_date.gte.${periodStart}`)
    .order("effective_date", { ascending: false });

  const rateMap = new Map<string, { ratePerUnit: number; rateType: RateType }>();
  for (const rate of rates ?? []) {
    // Only set if not already set — first entry is most recent due to DESC ordering
    if (!rateMap.has(rate.material_id)) {
      rateMap.set(rate.material_id, {
        ratePerUnit: rate.rate_per_unit,
        rateType: (rate.rate_type as RateType) ?? "per_ton",
      });
    }
  }

  // 4. Calculate line items — using calculateAmount() to respect per_load vs per_ton
  const lines: SettlementLinePreview[] = [];
  let haulingAmount = 0;
  const warnings: string[] = [];

  for (const delivery of carrierDeliveries) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const material = delivery.material as any;
    const materialId = delivery.material_id;
    const rateInfo = rateMap.get(materialId);
    const ratePerUnit = rateInfo?.ratePerUnit ?? 0;
    const rateType = rateInfo?.rateType ?? "per_ton";

    if (ratePerUnit === 0) {
      warnings.push(
        `No carrier rate configured for ${material?.name ?? "Unknown"} for ${carrier.name}. Line item will be $0.`
      );
    }

    // THE FIX: each delivery is 1 load — calculateAmount respects rate_type
    const calc = calculateAmount({
      rateType,
      ratePerUnit,
      netWeight: delivery.net_weight,
      deliveryCount: 1, // each delivery = 1 load
    });

    if (calc.missingWeight) {
      warnings.push(
        `Missing weight for delivery ${delivery.id} (${material?.name ?? "Unknown"}): per-ton rate but no weight recorded.`
      );
    }

    lines.push({
      delivery_id: delivery.id,
      delivery_date: delivery.delivered_at,
      ticket_number: delivery.ticket_number,
      material_name: material?.name ?? "Unknown",
      net_weight: delivery.net_weight ?? 0,
      unit: calc.unit,
      rate: ratePerUnit,
      amount: calc.amount,
    });

    haulingAmount += calc.amount;
  }

  // Sort lines by date
  lines.sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));

  // 5. Calculate dispatch fee
  const weeks = weeksInPeriod(periodStart, periodEnd);
  const dispatchFee = (carrier.dispatch_fee_weekly ?? 0) * weeks;

  const totalAmount = haulingAmount + dispatchFee;

  return {
    carrier: carrier as Carrier,
    period_start: periodStart,
    period_end: periodEnd,
    lines,
    hauling_amount: haulingAmount,
    dispatch_fee: dispatchFee,
    deductions: 0,
    total_amount: totalAmount,
    delivery_count: lines.length,
    weeks_in_period: weeks,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Generate — creates the settlement and line items in the database
// ---------------------------------------------------------------------------

export async function generateSettlement(
  carrierId: string,
  periodStart: string,
  periodEnd: string,
  supabaseClient?: SupabaseClient
): Promise<CarrierSettlement> {
  const supabase = supabaseClient ?? await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  // 1. Preview to get the line items
  const preview = await previewSettlement(carrierId, periodStart, periodEnd, supabaseClient);

  if (preview.lines.length === 0) {
    throw new Error("No confirmed deliveries found for this carrier in the selected period.");
  }

  // Reject generation if any line item has a $0 rate
  const zeroRateLines = preview.lines.filter((line) => line.rate === 0);
  if (zeroRateLines.length > 0) {
    const materials = [...new Set(zeroRateLines.map((l) => l.material_name))].join(", ");
    throw new Error(
      `Cannot generate settlement: No carrier rate configured for ${materials} for ${preview.carrier.name}. Please set up rates first.`
    );
  }

  // 2. Generate settlement number
  const settlementNumber = await generateSettlementNumber(supabaseClient);

  // 3. Create the settlement record
  const { data: settlement, error: setErr } = await supabase
    .from("carrier_settlements")
    .insert({
      carrier_id: carrierId,
      settlement_number: settlementNumber,
      period_start: periodStart,
      period_end: periodEnd,
      hauling_amount: preview.hauling_amount,
      dispatch_fee: preview.dispatch_fee,
      deductions: 0,
      total_amount: preview.total_amount,
      status: "draft" as const,
    })
    .select()
    .single();

  if (setErr || !settlement) {
    throw new Error(`Failed to create settlement: ${setErr?.message}`);
  }

  // 4. Create settlement line items
  const lineInserts = preview.lines.map((line) => ({
    settlement_id: settlement.id,
    delivery_id: line.delivery_id,
    rate_applied: line.rate,
    amount: line.amount,
  }));

  if (lineInserts.length > 0) {
    const { error: lineErr } = await supabase
      .from("carrier_settlement_lines")
      .insert(lineInserts);

    if (lineErr) {
      // Lines failed — clean up the orphaned settlement record
      console.error("[Settlement] Failed to create settlement lines:", lineErr.message);
      try {
        await supabase
          .from("carrier_settlements")
          .delete()
          .eq("id", settlement.id);
      } catch (cleanupErr) {
        console.error("[Settlement] CRITICAL: Failed to clean up orphaned settlement:", settlement.id, cleanupErr);
      }
      throw new Error(`Failed to create settlement lines: ${lineErr.message}`);
    }
  }

  return settlement as CarrierSettlement;
}

// ---------------------------------------------------------------------------
// Get settlement with full details
// ---------------------------------------------------------------------------

export async function getSettlementWithDetails(
  settlementId: string
): Promise<SettlementWithFullDetails | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("carrier_settlements")
    .select(`
      *,
      carrier:carriers(*),
      lines:carrier_settlement_lines(
        *,
        delivery:deliveries(
          *,
          material:materials(*)
        )
      )
    `)
    .eq("id", settlementId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch settlement: ${error.message}`);
  }

  return data as SettlementWithFullDetails;
}

// ---------------------------------------------------------------------------
// Approve settlement — mark approved, sync to QB as Bill
// ---------------------------------------------------------------------------

export async function approveSettlement(
  settlementId: string,
  approvedBy: string
): Promise<CarrierSettlement> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  // Verify settlement exists and is draft
  const { data: settlement, error: getErr } = await supabase
    .from("carrier_settlements")
    .select("*")
    .eq("id", settlementId)
    .single();

  if (getErr || !settlement) {
    throw new Error("Settlement not found");
  }

  if (settlement.status !== "draft") {
    throw new Error("Only draft settlements can be approved");
  }

  // Update status
  const { data: updated, error: updateErr } = await supabase
    .from("carrier_settlements")
    .update({
      status: "approved" as const,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq("id", settlementId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to approve settlement: ${updateErr?.message}`);
  }

  // Sync to QB as Bill (non-blocking)
  try {
    const { syncSettlementToQBO } = await import(
      "@/lib/services/quickbooks.service"
    );
    const qbResult = await syncSettlementToQBO(settlementId);
    if (qbResult.success && qbResult.qbBillId) {
      await supabase
        .from("carrier_settlements")
        .update({ qb_bill_id: qbResult.qbBillId })
        .eq("id", settlementId);
    }
  } catch (qbErr) {
    console.error("[Settlement] QB sync failed:", qbErr instanceof Error ? qbErr.message : qbErr);
  }

  return updated as CarrierSettlement;
}

// ---------------------------------------------------------------------------
// Pay settlement — trigger QB Bill Pay, update status to paid
// ---------------------------------------------------------------------------

export async function paySettlement(
  settlementId: string
): Promise<CarrierSettlement> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  // Verify settlement is approved
  const { data: settlement, error: getErr } = await supabase
    .from("carrier_settlements")
    .select("*")
    .eq("id", settlementId)
    .single();

  if (getErr || !settlement) {
    throw new Error("Settlement not found");
  }

  if (settlement.status !== "approved") {
    throw new Error("Only approved settlements can be paid");
  }

  // If not synced to QB yet, sync now
  if (!settlement.qb_bill_id) {
    try {
      const { syncSettlementToQBO } = await import(
        "@/lib/services/quickbooks.service"
      );
      const qbResult = await syncSettlementToQBO(settlementId);
      if (qbResult.success && qbResult.qbBillId) {
        await supabase
          .from("carrier_settlements")
          .update({ qb_bill_id: qbResult.qbBillId })
          .eq("id", settlementId);
      }
    } catch (qbSyncErr) {
      console.error("[Settlement] QB bill sync failed during pay:", qbSyncErr instanceof Error ? qbSyncErr.message : qbSyncErr);
    }
  }

  // Create QB Bill Payment (ACH)
  let qbPaymentSuccess = false;
  try {
    const { createBillPaymentInQBO, getQBClient } = await import(
      "@/lib/services/quickbooks.service"
    );
    const qbClient = await getQBClient();
    if (qbClient) {
      const payResult = await createBillPaymentInQBO(settlementId);
      if (payResult.success) {
        qbPaymentSuccess = true;
        console.log(`[Settlement] QB bill payment created for ${settlementId}`);
      } else {
        // QBO configured but payment failed — DON'T mark as paid
        throw new Error(
          `Settlement approved but payment failed: ${payResult.error}. Please retry or process manually in QuickBooks.`
        );
      }
    } else {
      // QBO not configured (dev mode) — allow marking as paid
      qbPaymentSuccess = true;
    }
  } catch (qbErr) {
    throw new Error(
      `Settlement payment error: ${qbErr instanceof Error ? qbErr.message : "Unknown error"}. Settlement remains approved — payment not sent.`
    );
  }

  // Only mark paid if payment succeeded
  if (!qbPaymentSuccess) {
    throw new Error("Settlement payment was not successful. Settlement remains approved.");
  }

  const { data: updated, error: updateErr } = await supabase
    .from("carrier_settlements")
    .update({
      status: "paid" as const,
      paid_at: new Date().toISOString(),
    })
    .eq("id", settlementId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to mark settlement as paid: ${updateErr?.message}`);
  }

  return updated as CarrierSettlement;
}

// ---------------------------------------------------------------------------
// Delete settlement — only drafts
// ---------------------------------------------------------------------------

export async function deleteSettlement(
  settlementId: string
): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: settlement } = await supabase
    .from("carrier_settlements")
    .select("status")
    .eq("id", settlementId)
    .single();

  if (!settlement) throw new Error("Settlement not found");
  if (settlement.status !== "draft") {
    throw new Error("Only draft settlements can be deleted");
  }

  // Delete lines first
  const { error: lineDeleteErr } = await supabase
    .from("carrier_settlement_lines")
    .delete()
    .eq("settlement_id", settlementId);

  if (lineDeleteErr) {
    throw new Error(`Failed to delete settlement lines: ${lineDeleteErr.message}`);
  }

  // Delete settlement
  const { error } = await supabase
    .from("carrier_settlements")
    .delete()
    .eq("id", settlementId);

  if (error) throw new Error(`Failed to delete settlement: ${error.message}`);
}
