"use server";

import { revalidatePath } from "next/cache";
import { getUser, requireRole } from "@/lib/supabase/auth";
import { isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import * as dispatchesData from "@/lib/data/dispatches.data";
import * as deliveriesData from "@/lib/data/deliveries.data";
import * as driversData from "@/lib/data/drivers.data";

import { signOut } from "@/lib/supabase/auth";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type {
  Delivery,
  DeliveryWithRelations,
  DispatchWithRelations,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Sign out wrapper — safe to use as a Server Action prop
// ---------------------------------------------------------------------------

export async function signOutAction() {
  await signOut();
}

// ---------------------------------------------------------------------------
// Helper: Get the driver record for the current user
// ---------------------------------------------------------------------------

async function getCurrentDriver() {
  const user = await getUser();
  if (!user) return null;

  const driver = await driversData.getByProfileId(user.user.id);
  return driver ? { ...driver, profileStatus: user.profile.status } : null;
}

// ---------------------------------------------------------------------------
// Get today's loads for the logged-in driver
// ---------------------------------------------------------------------------

export async function getMyLoads(): Promise<
  ActionResult<DispatchWithRelations[]>
> {
  try {
    await requireRole("driver");
    const driver = await getCurrentDriver();
    if (!driver) {
      return ok([]); // No driver profile — return empty
    }

    const dispatches = await dispatchesData.getForDriver(driver.id);

    // Filter to today's dispatches (or future scheduled)
    const today = new Date().toISOString().slice(0, 10);
    const todaysLoads = dispatches.filter(
      (d) => d.scheduled_date >= today
    );

    return ok(todaysLoads);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Get deliverable dispatches (status: dispatched, acknowledged, in_transit, loaded)
// ---------------------------------------------------------------------------

export async function getDeliverableLoads(): Promise<
  ActionResult<DispatchWithRelations[]>
> {
  try {
    await requireRole("driver");
    const driver = await getCurrentDriver();
    if (!driver) {
      return ok([]);
    }

    if (isDemoMode()) {
      const { DEMO_DISPATCHES_WITH_RELATIONS } = await import("@/lib/demo/data");
      const activeStatuses = ["dispatched", "acknowledged", "in_progress"];
      return ok(
        DEMO_DISPATCHES_WITH_RELATIONS.filter(
          (d) => d.driver_id === driver.id && activeStatuses.includes(d.status)
        )
      );
    }

    const supabase = await createClient();
    if (!supabase) return ok([]);

    const DISPATCH_RELATIONS = `
      *,
      order:orders(*),
      carrier:carriers(*),
      driver:drivers(*),
      truck:trucks(*),
      material:materials(*),
      pickup_site:sites!dispatches_pickup_site_id_fkey(*),
      delivery_site:sites!dispatches_delivery_site_id_fkey(*),
      purchase_order:purchase_orders(*)
    `;

    const { data, error } = await supabase
      .from("dispatches")
      .select(DISPATCH_RELATIONS)
      .eq("driver_id", driver.id)
      .in("status", [
        "dispatched",
        "acknowledged",
        "in_progress",
      ])
      .order("scheduled_date", { ascending: true });

    if (error) throw new Error(error.message);

    return ok((data ?? []) as DispatchWithRelations[]);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Submit a delivery
// ---------------------------------------------------------------------------

interface SubmitDeliveryInput {
  dispatch_id: string;
  ticket_number: string;
  net_weight: number | null;
  notes: string;
  photo_url?: string | null;
}

export async function submitDelivery(
  input: SubmitDeliveryInput
): Promise<ActionResult<Delivery>> {
  try {
    await requireRole("driver");
    const driver = await getCurrentDriver();
    if (!driver) {
      return fail("Not authenticated as a driver");
    }

    if (isDemoMode()) {
      // Demo mode: return a fake delivery
      const { DEMO_DELIVERIES } = await import("@/lib/demo/data");
      return ok(DEMO_DELIVERIES[0]);
    }

    // Get the dispatch to extract truck_id, material_id, delivery_site_id
    const dispatch = await dispatchesData.getById(input.dispatch_id);
    if (!dispatch) {
      return fail("Dispatch not found");
    }

    if (dispatch.driver_id !== driver.id) {
      return fail("This dispatch is not assigned to you");
    }

    // Prevent duplicate delivery submissions for the same dispatch
    const supabase = await createClient();
    if (supabase) {
      const { data: existingDelivery } = await supabase
        .from("deliveries")
        .select("id")
        .eq("dispatch_id", input.dispatch_id)
        .maybeSingle();

      if (existingDelivery) {
        return fail("A delivery has already been submitted for this dispatch");
      }
    }

    // Create the delivery record
    const delivery = await deliveriesData.create({
      dispatch_id: input.dispatch_id,
      driver_id: driver.id,
      truck_id: dispatch.truck_id,
      material_id: dispatch.material_id,
      delivery_site_id: dispatch.delivery_site_id,
      ticket_number: input.ticket_number || null,
      ticket_photo_url: input.photo_url || null,
      net_weight: input.net_weight,
      gross_weight: null,
      tare_weight: null,
      gps_latitude: null,
      gps_longitude: null,
      gps_accuracy_meters: null,
      geofence_verified: false,
      delivered_at: new Date().toISOString(),
      confirmation_status: "pending",
      confirmed_at: null,
      confirmed_by: null,
      dispute_reason: null,
      dispute_resolved_at: null,
      dispute_resolved_by: null,
      dispute_resolution: null,
      synced_offline: false,
      synced_at: null,
    });

    // Update dispatch status to "delivered"
    await dispatchesData.update(input.dispatch_id, {
      status: "delivered",
    });

    // Notify customer about completed delivery (in-app + SMS via Twilio)
    try {
      const { notifyCustomerDelivery } = await import(
        "@/lib/services/notification.service"
      );
      await notifyCustomerDelivery(delivery);
    } catch (notifError) {
      // Don't fail the delivery if notification fails
      console.error("[trucker] Failed to send customer notification:", notifError);
    }

    revalidatePath("/trucker/loads");
    revalidatePath("/trucker/deliver");
    revalidatePath("/trucker/history");
    revalidatePath("/admin/dispatch");
    revalidatePath("/admin/deliveries");
    revalidatePath("/customer/deliveries");

    return ok(delivery);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Upload ticket photo to Supabase Storage
// ---------------------------------------------------------------------------

export async function uploadTicketPhoto(
  formData: FormData
): Promise<ActionResult<string>> {
  try {
    await requireRole("driver");

    if (isDemoMode()) {
      return ok("https://demo.example.com/ticket-photo.jpg");
    }

    const supabase = await createClient();
    if (!supabase) {
      return fail("Storage not configured");
    }

    const file = formData.get("photo") as File;
    if (!file || file.size === 0) {
      return fail("No file provided");
    }

    const driver = await getCurrentDriver();
    const driverId = driver?.id ?? "unknown";
    const filename = `ticket-photos/${driverId}/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from("deliveries")
      .upload(filename, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      // If bucket doesn't exist, return gracefully
      if (error.message?.includes("not found") || error.message?.includes("Bucket")) {
        console.warn("[trucker] Storage bucket 'deliveries' not found. Photo upload skipped.");
        return fail("Photo storage not set up yet. Delivery saved without photo.");
      }
      throw error;
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("deliveries").getPublicUrl(data.path);

    return ok(publicUrl);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Get delivery history for the logged-in driver
// ---------------------------------------------------------------------------

interface HistoryFilters {
  days?: number; // last N days
  ticket_number?: string;
  date_from?: string;
  date_to?: string;
}

export async function getMyHistory(
  filters?: HistoryFilters
): Promise<ActionResult<DeliveryWithRelations[]>> {
  try {
    await requireRole("driver");
    const driver = await getCurrentDriver();
    if (!driver) {
      return ok([]);
    }

    if (isDemoMode()) {
      const { DEMO_DELIVERIES_WITH_RELATIONS } = await import("@/lib/demo/data");
      return ok(
        DEMO_DELIVERIES_WITH_RELATIONS.filter((d) => d.driver_id === driver.id)
      );
    }

    const supabase = await createClient();
    if (!supabase) return ok([]);

    const DELIVERY_RELATIONS = `
      *,
      dispatch:dispatches(
        *,
        material:materials(*),
        pickup_site:sites!dispatches_pickup_site_id_fkey(*),
        delivery_site:sites!dispatches_delivery_site_id_fkey(*),
        purchase_order:purchase_orders(*)
      ),
      driver:drivers(*),
      truck:trucks(*),
      material:materials(*),
      delivery_site:sites(*)
    `;

    let query = supabase
      .from("deliveries")
      .select(DELIVERY_RELATIONS)
      .eq("driver_id", driver.id)
      .order("delivered_at", { ascending: false });

    // Apply date filters
    if (filters?.days) {
      const from = new Date();
      from.setDate(from.getDate() - filters.days);
      query = query.gte("delivered_at", from.toISOString());
    } else if (filters?.date_from) {
      query = query.gte("delivered_at", filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte("delivered_at", filters.date_to);
    }

    // Ticket number search
    if (filters?.ticket_number) {
      query = query.ilike("ticket_number", `%${filters.ticket_number}%`);
    }

    // Limit to 100 for performance
    query = query.limit(100);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return ok((data ?? []) as DeliveryWithRelations[]);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Get driver's profile status (for pending approval check)
// ---------------------------------------------------------------------------

export async function getDriverStatus(): Promise<
  ActionResult<{ status: string; driverId: string | null }>
> {
  try {
    await requireRole("driver");
    const user = await getUser();
    if (!user) {
      return ok({ status: "unauthenticated", driverId: null });
    }

    const driver = await driversData.getByProfileId(user.user.id);

    return ok({
      status: user.profile.status,
      driverId: driver?.id ?? null,
    });
  } catch (error) {
    return fail(error);
  }
}
