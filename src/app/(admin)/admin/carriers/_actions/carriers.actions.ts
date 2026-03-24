"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import {
  createCarrierSchema,
  updateCarrierSchema,
} from "@/lib/schemas/carrier";
import { createDriverSchema, updateDriverSchema } from "@/lib/schemas/driver";
import { createTruckSchema, updateTruckSchema } from "@/lib/schemas/truck";
import * as carriersData from "@/lib/data/carriers.data";
import * as driversData from "@/lib/data/drivers.data";
import * as trucksData from "@/lib/data/trucks.data";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type { Carrier, Driver, Truck } from "@/types/database";

// ---------------------------------------------------------------------------
// Helper: Convert Zod's undefined → null for Supabase compatibility
// ---------------------------------------------------------------------------

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
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Carrier CRUD
// ---------------------------------------------------------------------------

export async function createCarrier(
  formData: unknown
): Promise<ActionResult<Carrier>> {
  try {
    await requireRole("admin");
    const parsed = createCarrierSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const carrier = await carriersData.create(toDbValues(parsed.data) as Parameters<typeof carriersData.create>[0]);
    revalidatePath("/admin/carriers");
    return ok(carrier);
  } catch (error) {
    return fail(error);
  }
}

export async function updateCarrier(
  id: string,
  formData: unknown
): Promise<ActionResult<Carrier>> {
  try {
    await requireRole("admin");
    const parsed = updateCarrierSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const carrier = await carriersData.update(id, toDbPartial(parsed.data) as Parameters<typeof carriersData.update>[1]);
    revalidatePath("/admin/carriers");
    return ok(carrier);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteCarrier(
  id: string
): Promise<ActionResult<Carrier>> {
  try {
    await requireRole("admin");
    const carrier = await carriersData.remove(id);
    revalidatePath("/admin/carriers");
    return ok(carrier);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Driver CRUD
// ---------------------------------------------------------------------------

export async function createDriver(
  formData: unknown
): Promise<ActionResult<Driver>> {
  try {
    await requireRole("admin");
    const parsed = createDriverSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const driver = await driversData.create(toDbValues(parsed.data) as Parameters<typeof driversData.create>[0]);
    revalidatePath("/admin/carriers");
    return ok(driver);
  } catch (error) {
    return fail(error);
  }
}

export async function updateDriver(
  id: string,
  formData: unknown
): Promise<ActionResult<Driver>> {
  try {
    await requireRole("admin");
    const parsed = updateDriverSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const driver = await driversData.update(id, toDbPartial(parsed.data) as Parameters<typeof driversData.update>[1]);
    revalidatePath("/admin/carriers");
    return ok(driver);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteDriver(
  id: string
): Promise<ActionResult<Driver>> {
  try {
    await requireRole("admin");
    const driver = await driversData.remove(id);
    revalidatePath("/admin/carriers");
    return ok(driver);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Truck CRUD
// ---------------------------------------------------------------------------

export async function createTruck(
  formData: unknown
): Promise<ActionResult<Truck>> {
  try {
    await requireRole("admin");
    const parsed = createTruckSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const truck = await trucksData.create(toDbValues(parsed.data) as Parameters<typeof trucksData.create>[0]);
    revalidatePath("/admin/carriers");
    return ok(truck);
  } catch (error) {
    return fail(error);
  }
}

export async function updateTruck(
  id: string,
  formData: unknown
): Promise<ActionResult<Truck>> {
  try {
    await requireRole("admin");
    const parsed = updateTruckSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const truck = await trucksData.update(id, toDbPartial(parsed.data) as Parameters<typeof trucksData.update>[1]);
    revalidatePath("/admin/carriers");
    return ok(truck);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteTruck(
  id: string
): Promise<ActionResult<Truck>> {
  try {
    await requireRole("admin");
    const truck = await trucksData.remove(id);
    revalidatePath("/admin/carriers");
    return ok(truck);
  } catch (error) {
    return fail(error);
  }
}
