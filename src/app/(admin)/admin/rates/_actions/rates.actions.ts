"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import { createRateSchema, updateRateSchema } from "@/lib/schemas/rate";
import * as ratesData from "@/lib/data/rates.data";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type { Rate } from "@/types/database";

// Convert Zod's undefined → null for Supabase compatibility
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

export async function createRate(
  formData: unknown
): Promise<ActionResult<Rate>> {
  try {
    await requireRole("admin");
    const parsed = createRateSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const rate = await ratesData.create(toDbValues(parsed.data) as Parameters<typeof ratesData.create>[0]);
    revalidatePath("/admin/rates");
    return ok(rate);
  } catch (error) {
    return fail(error);
  }
}

export async function updateRate(
  id: string,
  formData: unknown
): Promise<ActionResult<Rate>> {
  try {
    await requireRole("admin");
    const parsed = updateRateSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const rate = await ratesData.update(id, toDbPartial(parsed.data) as Parameters<typeof ratesData.update>[1]);
    revalidatePath("/admin/rates");
    return ok(rate);
  } catch (error) {
    return fail(error);
  }
}

export async function deactivateRate(
  id: string
): Promise<ActionResult<Rate>> {
  try {
    await requireRole("admin");
    const rate = await ratesData.deactivate(id);
    revalidatePath("/admin/rates");
    return ok(rate);
  } catch (error) {
    return fail(error);
  }
}
