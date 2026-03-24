"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import * as materialsData from "@/lib/data/materials.data";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type { Material } from "@/types/database";

const createMaterialSchema = z.object({
  name: z.string().min(2, "Material name is required").max(100),
  unit_of_measure: z.enum(["ton", "load"]).default("ton"),
  description: z.string().max(500).optional(),
});

export async function createMaterial(
  formData: unknown
): Promise<ActionResult<Material>> {
  try {
    await requireRole("admin");
    const parsed = createMaterialSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const material = await materialsData.create({
      ...parsed.data,
      description: parsed.data.description ?? null,
      status: "active",
    });
    revalidatePath("/admin/settings");
    return ok(material);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteMaterial(
  id: string
): Promise<ActionResult<Material>> {
  try {
    await requireRole("admin");
    const material = await materialsData.remove(id);
    revalidatePath("/admin/settings");
    return ok(material);
  } catch (error) {
    return fail(error);
  }
}
