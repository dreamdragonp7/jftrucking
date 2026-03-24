"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import * as deliveriesData from "@/lib/data/deliveries.data";
import * as notificationsData from "@/lib/data/notifications.data";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type { DeliveryWithRelations } from "@/types/database";

/**
 * Get all disputed deliveries for the admin disputes page.
 */
export async function getDisputes(filter: "open" | "resolved" = "open"): Promise<ActionResult<DeliveryWithRelations[]>> {
  try {
    await requireRole("admin");
    const supabase = await createClient();
    if (!supabase) return fail("Supabase not configured");

    const RELATIONS = `
      *,
      dispatch:dispatches(
        *,
        purchase_order:purchase_orders(
          *,
          customer:customers(*)
        ),
        carrier:carriers(*)
      ),
      driver:drivers(*),
      truck:trucks(*),
      material:materials(*),
      delivery_site:sites(*)
    `;

    let query = supabase
      .from("deliveries")
      .select(RELATIONS);

    if (filter === "open") {
      query = query.eq("confirmation_status", "disputed");
    } else {
      query = query.eq("confirmation_status", "confirmed")
        .not("dispute_resolved_at", "is", null);
    }

    query = query.order("updated_at", { ascending: false });

    const { data, error } = await query;
    if (error) return fail(error.message);

    return ok(data as DeliveryWithRelations[]);
  } catch (e) {
    return fail(e);
  }
}

/**
 * Resolve a dispute — admin confirms or rejects the delivery.
 */
export async function resolveDispute(
  deliveryId: string,
  resolution: "confirm" | "reject",
  notes: string
): Promise<ActionResult<void>> {
  try {
    const auth = await requireRole("admin");

    if (resolution === "confirm") {
      // Admin overrides customer dispute — delivery goes back to invoice queue
      await deliveriesData.resolveDispute(
        deliveryId,
        auth.user.id,
        notes || "Admin confirmed delivery after review",
        "confirmed"
      );
    } else {
      // Admin agrees with customer — delivery is rejected
      await deliveriesData.resolveDispute(
        deliveryId,
        auth.user.id,
        notes || "Admin rejected delivery after review",
        "confirmed" // We still "resolve" it but the note explains rejection
      );

      // Also update the dispatch status to cancelled
      const supabase = await createClient();
      if (supabase) {
        const delivery = await deliveriesData.getById(deliveryId);
        if (delivery) {
          await supabase
            .from("dispatches")
            .update({ status: "cancelled" })
            .eq("id", delivery.dispatch_id);
        }
      }
    }

    // Notify customer about the resolution
    try {
      const supabase = await createClient();
      if (supabase) {
        const delivery = await deliveriesData.getById(deliveryId);
        if (delivery) {
          // Get customer profiles through dispatch -> PO chain
          const { data: dispatch } = await supabase
            .from("dispatches")
            .select("purchase_order:purchase_orders(customer_id)")
            .eq("id", delivery.dispatch_id)
            .single();

          const customerId = (dispatch?.purchase_order as { customer_id?: string } | null)?.customer_id;
          if (customerId) {
            const { data: customer } = await supabase
              .from("customers")
              .select("name")
              .eq("id", customerId)
              .single();

            const { data: customerProfiles } = await supabase
              .from("profiles")
              .select("id")
              .eq("company_name", customer?.name ?? "")
              .eq("role", "customer")
              .eq("status", "active");

            if (customerProfiles && customerProfiles.length > 0) {
              const notifications = customerProfiles.map((p) => ({
                user_id: p.id,
                type: "delivery_confirmed" as const,
                title: resolution === "confirm" ? "Dispute Resolved - Delivery Confirmed" : "Dispute Resolved - Delivery Rejected",
                message: notes || (resolution === "confirm"
                  ? "Your disputed delivery has been reviewed and confirmed by the admin."
                  : "Your disputed delivery has been reviewed and rejected."),
                channel: "in_app" as const,
                read: false,
                read_at: null,
                data: { delivery_id: deliveryId, resolution },
              }));

              await notificationsData.createBulk(notifications);
            }
          }
        }
      }
    } catch (notifyErr) {
      console.error("[disputes] Failed to send resolution notification:", notifyErr);
    }

    revalidatePath("/admin/disputes");
    revalidatePath("/admin/deliveries");
    revalidatePath("/admin/dashboard");

    return ok(undefined);
  } catch (e) {
    return fail(e);
  }
}
