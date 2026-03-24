"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "@/lib/schemas/customer";
import * as customersData from "@/lib/data/customers.data";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type { Customer } from "@/types/database";

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

export async function createCustomer(
  formData: unknown
): Promise<ActionResult<Customer>> {
  try {
    await requireRole("admin");
    const parsed = createCustomerSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const customer = await customersData.create(toDbValues(parsed.data) as Parameters<typeof customersData.create>[0]);
    revalidatePath("/admin/customers");
    return ok(customer);
  } catch (error) {
    return fail(error);
  }
}

export async function updateCustomer(
  id: string,
  formData: unknown
): Promise<ActionResult<Customer>> {
  try {
    await requireRole("admin");
    const parsed = updateCustomerSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const customer = await customersData.update(id, toDbPartial(parsed.data) as Parameters<typeof customersData.update>[1]);
    revalidatePath("/admin/customers");
    return ok(customer);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteCustomer(
  id: string
): Promise<ActionResult<Customer>> {
  try {
    await requireRole("admin");
    const customer = await customersData.remove(id);
    revalidatePath("/admin/customers");
    return ok(customer);
  } catch (error) {
    return fail(error);
  }
}

export async function approveCustomer(
  id: string
): Promise<ActionResult<Customer>> {
  try {
    await requireRole("admin");
    const customer = await customersData.update(id, { status: "active" });
    revalidatePath("/admin/customers");
    return ok(customer);
  } catch (error) {
    return fail(error);
  }
}
