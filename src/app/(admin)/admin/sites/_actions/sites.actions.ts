"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import { createSiteSchema, updateSiteSchema } from "@/lib/schemas/site";
import * as sitesData from "@/lib/data/sites.data";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type { Site } from "@/types/database";

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

export async function createSite(formData: unknown): Promise<ActionResult<Site>> {
  try {
    await requireRole("admin");
    const parsed = createSiteSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const site = await sitesData.create(toDbValues(parsed.data) as Parameters<typeof sitesData.create>[0]);
    revalidatePath("/admin/sites");
    return ok(site);
  } catch (error) {
    return fail(error);
  }
}

export async function updateSite(
  id: string,
  formData: unknown
): Promise<ActionResult<Site>> {
  try {
    await requireRole("admin");
    const parsed = updateSiteSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const site = await sitesData.update(id, toDbPartial(parsed.data) as Parameters<typeof sitesData.update>[1]);
    revalidatePath("/admin/sites");
    return ok(site);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteSite(id: string): Promise<ActionResult<Site>> {
  try {
    await requireRole("admin");
    const site = await sitesData.remove(id);
    revalidatePath("/admin/sites");
    return ok(site);
  } catch (error) {
    return fail(error);
  }
}
