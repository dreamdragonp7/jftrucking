"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
} from "@/lib/schemas/purchase-order";
import * as purchaseOrdersData from "@/lib/data/purchase-orders.data";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type { PurchaseOrder } from "@/types/database";

// Convert Zod's undefined -> null for Supabase compatibility
function toDbValues<T extends Record<string, unknown>>(obj: T) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = value === undefined ? null : value;
  }
  return result;
}

function toDbPartial<T extends Record<string, unknown>>(obj: T) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}

export async function createPurchaseOrder(
  formData: unknown
): Promise<ActionResult<PurchaseOrder>> {
  try {
    await requireRole("admin");
    const parsed = createPurchaseOrderSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const po = await purchaseOrdersData.create(
      toDbValues(parsed.data) as Parameters<typeof purchaseOrdersData.create>[0]
    );
    revalidatePath("/admin/purchase-orders");
    return ok(po);
  } catch (error) {
    return fail(error);
  }
}

export async function updatePurchaseOrder(
  id: string,
  formData: unknown
): Promise<ActionResult<PurchaseOrder>> {
  try {
    await requireRole("admin");
    const parsed = updatePurchaseOrderSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const po = await purchaseOrdersData.update(
      id,
      toDbPartial(parsed.data) as Parameters<typeof purchaseOrdersData.update>[1]
    );
    revalidatePath("/admin/purchase-orders");
    return ok(po);
  } catch (error) {
    return fail(error);
  }
}

export async function deletePurchaseOrder(
  id: string
): Promise<ActionResult<PurchaseOrder>> {
  try {
    await requireRole("admin");
    const po = await purchaseOrdersData.remove(id);
    revalidatePath("/admin/purchase-orders");
    return ok(po);
  } catch (error) {
    return fail(error);
  }
}
