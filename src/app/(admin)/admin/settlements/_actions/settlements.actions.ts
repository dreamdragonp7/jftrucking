"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import * as settlementsData from "@/lib/data/settlements.data";
import {
  previewSettlement,
  generateSettlement,
  approveSettlement,
  paySettlement,
  deleteSettlement,
  getSettlementWithDetails,
  type SettlementPreview,
  type SettlementWithFullDetails,
} from "@/lib/services/settlement.service";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type { CarrierSettlement } from "@/types/database";

// ---------------------------------------------------------------------------
// Preview settlement
// ---------------------------------------------------------------------------

export async function previewSettlementAction(
  carrierId: string,
  periodStart: string,
  periodEnd: string
): Promise<ActionResult<SettlementPreview>> {
  try {
    await requireRole("admin");
    const preview = await previewSettlement(carrierId, periodStart, periodEnd);
    return ok(preview);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Generate settlement
// ---------------------------------------------------------------------------

export async function generateSettlementAction(
  carrierId: string,
  periodStart: string,
  periodEnd: string
): Promise<ActionResult<CarrierSettlement>> {
  try {
    await requireRole("admin");
    const settlement = await generateSettlement(carrierId, periodStart, periodEnd);

    revalidatePath("/admin/settlements");
    revalidatePath("/admin/payments");
    revalidatePath("/admin/dashboard");

    return ok(settlement);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Approve settlement
// ---------------------------------------------------------------------------

export async function approveSettlementAction(
  settlementId: string
): Promise<ActionResult<CarrierSettlement>> {
  try {
    const auth = await requireRole("admin");
    const settlement = await approveSettlement(settlementId, auth.user.id);

    revalidatePath("/admin/settlements");
    revalidatePath("/admin/payments");
    revalidatePath("/admin/dashboard");

    return ok(settlement);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Pay settlement
// ---------------------------------------------------------------------------

export async function paySettlementAction(
  settlementId: string
): Promise<ActionResult<CarrierSettlement>> {
  try {
    await requireRole("admin");
    const settlement = await paySettlement(settlementId);

    revalidatePath("/admin/settlements");
    revalidatePath("/admin/payments");
    revalidatePath("/admin/dashboard");

    return ok(settlement);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Delete settlement
// ---------------------------------------------------------------------------

export async function deleteSettlementAction(
  settlementId: string
): Promise<ActionResult<void>> {
  try {
    await requireRole("admin");
    await deleteSettlement(settlementId);

    revalidatePath("/admin/settlements");
    revalidatePath("/admin/payments");
    revalidatePath("/admin/dashboard");

    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Get settlement details
// ---------------------------------------------------------------------------

export async function getSettlementDetailsAction(
  settlementId: string
): Promise<ActionResult<SettlementWithFullDetails>> {
  try {
    await requireRole("admin");
    const settlement = await getSettlementWithDetails(settlementId);
    if (!settlement) return fail("Settlement not found");
    return ok(settlement);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// List settlements
// ---------------------------------------------------------------------------

export async function getSettlementsAction(
  filters?: { status?: string; carrier_id?: string }
): Promise<
  ActionResult<{
    data: (CarrierSettlement & { carrier: { name: string } })[];
    count: number;
  }>
> {
  try {
    await requireRole("admin");
    const result = await settlementsData.getAll({
      status: filters?.status as CarrierSettlement["status"] | undefined,
      carrier_id: filters?.carrier_id,
      limit: 100,
    });
    return ok(result as { data: (CarrierSettlement & { carrier: { name: string } })[]; count: number });
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Get carriers for the generate dialog
// ---------------------------------------------------------------------------

export async function getCarriersForSettlementAction(): Promise<
  ActionResult<{ id: string; name: string; dispatch_fee_weekly: number }[]>
> {
  try {
    const auth = await requireRole("admin");
    const { data, error } = await auth.supabase
      .from("carriers")
      .select("id, name, dispatch_fee_weekly")
      .eq("status", "active")
      .order("name");

    if (error) throw new Error(error.message);
    return ok(data ?? []);
  } catch (error) {
    return fail(error);
  }
}
