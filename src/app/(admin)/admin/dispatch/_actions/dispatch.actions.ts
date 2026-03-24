"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import {
  createDispatchSchema,
  updateDispatchSchema,
} from "@/lib/schemas/dispatch";
import * as dispatchesData from "@/lib/data/dispatches.data";
import * as driversData from "@/lib/data/drivers.data";
import { sendDispatchSMS, isTwilioConfigured } from "@/lib/integrations/twilio";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type { Dispatch, DispatchWithRelations } from "@/types/database";

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

export async function createDispatch(
  formData: unknown
): Promise<ActionResult<Dispatch>> {
  try {
    await requireRole("admin");
    const parsed = createDispatchSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }

    // Credit limit check: look up the customer via purchase_order
    if (parsed.data.purchase_order_id) {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        if (supabase) {
          // Get customer from PO
          const { data: po } = await supabase
            .from("purchase_orders")
            .select("customer_id, customer:customers(id, name, credit_limit, credit_limit_enabled)")
            .eq("id", parsed.data.purchase_order_id)
            .single();

          const customer = po?.customer as unknown as { id: string; name: string; credit_limit: number; credit_limit_enabled: boolean } | null;
          if (customer?.credit_limit_enabled && customer.credit_limit > 0) {
            // Sum outstanding invoices for this customer
            const { data: invoices } = await supabase
              .from("invoices")
              .select("total")
              .eq("customer_id", customer.id)
              .eq("status", "sent");

            const outstandingBalance = (invoices ?? []).reduce(
              (sum, inv) => sum + ((inv.total as number) ?? 0),
              0
            );

            if (outstandingBalance >= customer.credit_limit) {
              return fail(
                `CREDIT_WARNING: ${customer.name} has an outstanding balance of $${outstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} which exceeds their credit limit of $${customer.credit_limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}. Use "Dispatch Anyway" to override.`
              );
            }
          }
        }
      } catch (creditErr) {
        // Credit check itself failed — block the dispatch to be safe
        console.error("[Dispatch] Credit check error — blocking dispatch:", creditErr instanceof Error ? creditErr.message : creditErr);
        return fail(
          `CREDIT_CHECK_ERROR: Unable to verify credit for this customer. The credit check system encountered an error. Please retry or use "Dispatch Anyway" to override.`
        );
      }
    }

    const insertData = toDbValues(parsed.data) as Parameters<typeof dispatchesData.create>[0];
    // Auto-dispatch: set status to "dispatched" with timestamp
    insertData.status = "dispatched";
    insertData.dispatched_at = new Date().toISOString();

    const dispatch = await dispatchesData.create(insertData);
    revalidatePath("/admin/dispatch");

    // Fire-and-forget: send SMS notification to the driver
    notifyDriverOfDispatch(dispatch.id).catch((err) => {
      console.warn("[Dispatch] Auto-SMS failed (non-blocking):", err instanceof Error ? err.message : err);
    });

    return ok(dispatch);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Create a dispatch with credit limit override (admin chose to bypass the warning).
 */
export async function createDispatchOverride(
  formData: unknown
): Promise<ActionResult<Dispatch>> {
  try {
    await requireRole("admin");
    const parsed = createDispatchSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    // Skip credit check — admin override
    const insertData = toDbValues(parsed.data) as Parameters<typeof dispatchesData.create>[0];
    insertData.status = "dispatched";
    insertData.dispatched_at = new Date().toISOString();

    const dispatch = await dispatchesData.create(insertData);
    revalidatePath("/admin/dispatch");

    // Fire-and-forget: send SMS notification to the driver
    notifyDriverOfDispatch(dispatch.id).catch((err) => {
      console.warn("[Dispatch] Auto-SMS failed (non-blocking):", err instanceof Error ? err.message : err);
    });

    return ok(dispatch);
  } catch (error) {
    return fail(error);
  }
}

export async function updateDispatch(
  id: string,
  formData: unknown
): Promise<ActionResult<Dispatch>> {
  try {
    await requireRole("admin");
    const parsed = updateDispatchSchema.safeParse(formData);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Validation failed");
    }
    const dispatch = await dispatchesData.update(
      id,
      toDbPartial(parsed.data) as Parameters<typeof dispatchesData.update>[1]
    );
    revalidatePath("/admin/dispatch");
    return ok(dispatch);
  } catch (error) {
    return fail(error);
  }
}

export async function cancelDispatch(
  id: string
): Promise<ActionResult<Dispatch>> {
  try {
    await requireRole("admin");
    const dispatch = await dispatchesData.remove(id);
    revalidatePath("/admin/dispatch");
    return ok(dispatch);
  } catch (error) {
    return fail(error);
  }
}

/**
 * Internal helper: send SMS notification after dispatch creation.
 * Used as fire-and-forget from createDispatch / createDispatchOverride.
 * Does NOT update dispatch status (caller already set it to "dispatched").
 */
async function notifyDriverOfDispatch(dispatchId: string): Promise<void> {
  try {
    const dispatch = await dispatchesData.getById(dispatchId);
    if (!dispatch) return;

    const driver = await driversData.getById(dispatch.driver_id);
    if (!driver?.phone) return;

    if (!isTwilioConfigured()) {
      console.warn(
        `[dispatch] Auto-SMS skipped for dispatch ${dispatchId} — Twilio not configured.`
      );
      return;
    }

    await sendDispatchSMS(driver.phone, {
      material: dispatch.material?.name ?? "Material",
      pickupSite: dispatch.pickup_site?.name ?? "Pickup",
      deliverySite: dispatch.delivery_site?.name ?? "Delivery",
      siteContact: dispatch.delivery_site?.contact_name,
      sitePhone: dispatch.delivery_site?.contact_phone,
      scheduledDate: dispatch.scheduled_date,
    });
  } catch (err) {
    // Swallow — caller already catches with .catch()
    console.error("[dispatch] notifyDriverOfDispatch error:", err instanceof Error ? err.message : err);
  }
}

/**
 * Send dispatch SMS to driver, update status to 'dispatched'.
 */
export async function sendDispatchNotification(
  dispatchId: string
): Promise<ActionResult<{ smsStatus: string }>> {
  try {
    await requireRole("admin");
    // Get dispatch details
    const dispatch = await dispatchesData.getById(dispatchId);
    if (!dispatch) {
      return fail("Dispatch not found");
    }

    // Get driver details for phone number
    const driver = await driversData.getById(dispatch.driver_id);
    if (!driver) {
      return fail("Driver not found");
    }

    if (!driver.phone) {
      return fail(`Driver ${driver.name} has no phone number on file`);
    }

    let smsStatus = "skipped";

    if (isTwilioConfigured()) {
      const result = await sendDispatchSMS(driver.phone, {
        material: dispatch.material?.name ?? "Material",
        pickupSite: dispatch.pickup_site?.name ?? "Pickup",
        deliverySite: dispatch.delivery_site?.name ?? "Delivery",
        siteContact: dispatch.delivery_site?.contact_name,
        sitePhone: dispatch.delivery_site?.contact_phone,
        scheduledDate: dispatch.scheduled_date,
      });

      smsStatus = result?.status ?? "sent";
    } else {
      console.warn(
        `[dispatch] SMS skipped for dispatch ${dispatchId} — Twilio not configured. Would have sent to ${driver.phone}`
      );
      smsStatus = "skipped_no_config";
    }

    // Update dispatch status to dispatched with timestamp
    await dispatchesData.update(dispatchId, {
      status: "dispatched",
      dispatched_at: new Date().toISOString(),
    });

    revalidatePath("/admin/dispatch");
    return ok({ smsStatus });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Clone a dispatch for the next day (same driver/truck/route, new date).
 */
export async function cloneDispatch(
  dispatchId: string,
  newDate: string
): Promise<ActionResult<Dispatch>> {
  try {
    await requireRole("admin");
    const original = await dispatchesData.getById(dispatchId);
    if (!original) {
      return fail("Dispatch not found");
    }

    const cloneData = {
      order_id: original.order_id,
      carrier_id: original.carrier_id,
      driver_id: original.driver_id,
      truck_id: original.truck_id,
      material_id: original.material_id,
      pickup_site_id: original.pickup_site_id,
      delivery_site_id: original.delivery_site_id,
      purchase_order_id: original.purchase_order_id,
      scheduled_date: newDate,
      status: "scheduled" as const,
      dispatched_at: null,
      acknowledged_at: null,
      notes: original.notes,
    };

    const dispatch = await dispatchesData.create(cloneData);
    revalidatePath("/admin/dispatch");
    return ok(dispatch);
  } catch (error) {
    return fail(error);
  }
}
