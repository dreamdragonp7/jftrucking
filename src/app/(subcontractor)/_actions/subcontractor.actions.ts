"use server";

import { revalidatePath } from "next/cache";
import { requireRole, signOut } from "@/lib/supabase/auth";
import { isDemoMode } from "@/lib/demo";
import * as notificationsData from "@/lib/data/notifications.data";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type {
  Carrier,
  Driver,
  Truck,
  PurchaseOrderWithRelations,
  DispatchWithRelations,
  DeliveryWithRelations,
  CarrierSettlement,
  CarrierSettlementWithLines,
  Notification,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Sign out wrapper
// ---------------------------------------------------------------------------

export async function signOutAction() {
  await signOut();
}

// ---------------------------------------------------------------------------
// Helper: get the carrier record linked to the logged-in profile
// ---------------------------------------------------------------------------

async function getMyCarrier() {
  const auth = await requireRole("carrier");

  // Demo mode: return demo carrier data without querying Supabase
  if (isDemoMode()) {
    const { DEMO_CARRIERS } = await import("@/lib/demo/data");
    const carrier =
      DEMO_CARRIERS.find((c) => c.id === auth.profile.carrier_id) ??
      DEMO_CARRIERS[0]; // CD Hopkins is the carrier demo user
    return { auth, carrier: carrier as Carrier };
  }

  const supabase = auth.supabase;

  const { data: carrier } = await supabase
    .from("carriers")
    .select("*")
    .eq("id", auth.profile.carrier_id ?? "")
    .maybeSingle();

  return { auth, carrier };
}

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------

export interface CarrierDashboardData {
  carrierName: string;
  deliveriesThisMonth: number;
  pendingSettlements: number;
  pendingSettlementAmount: number;
  totalEarnedYtd: number;
  recentDeliveries: DeliveryWithRelations[];
}

export async function getCarrierDashboard(): Promise<ActionResult<CarrierDashboardData>> {
  try {
    const { auth, carrier } = await getMyCarrier();
    if (!carrier) {
      return ok({
        carrierName: auth.profile.company_name ?? "Your Company",
        deliveriesThisMonth: 0,
        pendingSettlements: 0,
        pendingSettlementAmount: 0,
        totalEarnedYtd: 0,
        recentDeliveries: [],
      });
    }

    if (isDemoMode()) {
      const {
        DEMO_DELIVERIES_WITH_RELATIONS,
        DEMO_SETTLEMENTS,
        DEMO_DRIVERS,
      } = await import("@/lib/demo/data");
      const carrierDriverIds = DEMO_DRIVERS
        .filter((d) => d.carrier_id === carrier.id)
        .map((d) => d.id);
      const carrierDeliveries = DEMO_DELIVERIES_WITH_RELATIONS.filter((d) =>
        carrierDriverIds.includes(d.driver_id)
      );
      const pendingSetts = DEMO_SETTLEMENTS.filter(
        (s) =>
          s.carrier_id === carrier.id &&
          ["draft", "approved"].includes(s.status)
      );
      const paidSetts = DEMO_SETTLEMENTS.filter(
        (s) => s.carrier_id === carrier.id && s.status === "paid"
      );
      return ok({
        carrierName: carrier.name,
        deliveriesThisMonth: carrierDeliveries.length,
        pendingSettlements: pendingSetts.length,
        pendingSettlementAmount: pendingSetts.reduce(
          (sum, s) => sum + s.total_amount,
          0
        ),
        totalEarnedYtd: paidSetts.reduce(
          (sum, s) => sum + s.total_amount,
          0
        ),
        recentDeliveries: carrierDeliveries.slice(0, 5),
      });
    }

    const supabase = auth.supabase;

    // Deliveries this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count: deliveryCount } = await supabase
      .from("deliveries")
      .select("*", { count: "exact", head: true })
      .gte("delivered_at", monthStart)
      .in(
        "dispatch_id",
        (await supabase
          .from("dispatches")
          .select("id")
          .in(
            "driver_id",
            (await supabase
              .from("drivers")
              .select("id")
              .eq("carrier_id", carrier.id)
            ).data?.map((d) => d.id) ?? []
          )
        ).data?.map((d) => d.id) ?? []
      );

    // Pending settlements
    const { data: pendingSettlements } = await supabase
      .from("carrier_settlements")
      .select("id, total_amount, status")
      .eq("carrier_id", carrier.id)
      .in("status", ["draft", "approved"]);

    const pendingCount = pendingSettlements?.length ?? 0;
    const pendingAmount = pendingSettlements?.reduce(
      (sum, s) => sum + (s.total_amount ?? 0),
      0
    ) ?? 0;

    // Total earned YTD (paid settlements)
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const { data: paidSettlements } = await supabase
      .from("carrier_settlements")
      .select("total_amount")
      .eq("carrier_id", carrier.id)
      .eq("status", "paid")
      .gte("paid_at", yearStart);

    const totalEarned = paidSettlements?.reduce(
      (sum, s) => sum + (s.total_amount ?? 0),
      0
    ) ?? 0;

    // Recent deliveries (last 5)
    const driverIds = (
      await supabase
        .from("drivers")
        .select("id")
        .eq("carrier_id", carrier.id)
    ).data?.map((d) => d.id) ?? [];

    let recentDeliveries: DeliveryWithRelations[] = [];
    if (driverIds.length > 0) {
      const dispatchIds = (
        await supabase
          .from("dispatches")
          .select("id")
          .in("driver_id", driverIds)
      ).data?.map((d) => d.id) ?? [];

      if (dispatchIds.length > 0) {
        const { data: deliveries } = await supabase
          .from("deliveries")
          .select(`
            *,
            dispatch:dispatches(*),
            driver:drivers(*),
            truck:trucks(*),
            material:materials(*),
            delivery_site:sites(*)
          `)
          .in("dispatch_id", dispatchIds)
          .order("delivered_at", { ascending: false })
          .limit(5);

        recentDeliveries = (deliveries ?? []) as DeliveryWithRelations[];
      }
    }

    return ok({
      carrierName: carrier.name,
      deliveriesThisMonth: deliveryCount ?? 0,
      pendingSettlements: pendingCount,
      pendingSettlementAmount: pendingAmount,
      totalEarnedYtd: totalEarned,
      recentDeliveries,
    });
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// DISPATCHES
// ---------------------------------------------------------------------------

export async function getCarrierDispatches(filters?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ActionResult<{ data: DispatchWithRelations[]; count: number }>> {
  try {
    const { auth, carrier } = await getMyCarrier();
    if (!carrier) return ok({ data: [], count: 0 });

    if (isDemoMode()) {
      const { DEMO_DISPATCHES_WITH_RELATIONS, DEMO_DRIVERS } = await import(
        "@/lib/demo/data"
      );
      const carrierDriverIds = DEMO_DRIVERS
        .filter((d) => d.carrier_id === carrier.id)
        .map((d) => d.id);
      let data = DEMO_DISPATCHES_WITH_RELATIONS.filter((d) =>
        carrierDriverIds.includes(d.driver_id)
      );
      if (filters?.status) data = data.filter((d) => d.status === filters.status);
      return ok({ data, count: data.length });
    }

    const supabase = auth.supabase;
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 25;
    const offset = (page - 1) * limit;

    // Get driver IDs for this carrier
    const { data: drivers } = await supabase
      .from("drivers")
      .select("id")
      .eq("carrier_id", carrier.id);

    const driverIds = drivers?.map((d) => d.id) ?? [];
    if (driverIds.length === 0) return ok({ data: [], count: 0 });

    let query = supabase
      .from("dispatches")
      .select(
        `
        *,
        order:orders(*),
        carrier:carriers(*),
        driver:drivers(*),
        truck:trucks(*),
        material:materials(*),
        pickup_site:sites!dispatches_pickup_site_id_fkey(*),
        delivery_site:sites!dispatches_delivery_site_id_fkey(*),
        purchase_order:purchase_orders(*)
      `,
        { count: "exact" }
      )
      .in("driver_id", driverIds);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    query = query
      .order("scheduled_date", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    return ok({
      data: (data ?? []) as DispatchWithRelations[],
      count: count ?? 0,
    });
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// DELIVERIES
// ---------------------------------------------------------------------------

export async function getCarrierDeliveries(filters?: {
  page?: number;
  limit?: number;
}): Promise<ActionResult<{ data: DeliveryWithRelations[]; count: number }>> {
  try {
    const { auth, carrier } = await getMyCarrier();
    if (!carrier) return ok({ data: [], count: 0 });

    if (isDemoMode()) {
      const { DEMO_DELIVERIES_WITH_RELATIONS, DEMO_DRIVERS } = await import(
        "@/lib/demo/data"
      );
      const carrierDriverIds = DEMO_DRIVERS
        .filter((d) => d.carrier_id === carrier.id)
        .map((d) => d.id);
      const data = DEMO_DELIVERIES_WITH_RELATIONS.filter((d) =>
        carrierDriverIds.includes(d.driver_id)
      );
      return ok({ data, count: data.length });
    }

    const supabase = auth.supabase;
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 25;
    const offset = (page - 1) * limit;

    // Get driver IDs for this carrier
    const { data: drivers } = await supabase
      .from("drivers")
      .select("id")
      .eq("carrier_id", carrier.id);

    const driverIds = drivers?.map((d) => d.id) ?? [];
    if (driverIds.length === 0) return ok({ data: [], count: 0 });

    const dispatchIds = (
      await supabase
        .from("dispatches")
        .select("id")
        .in("driver_id", driverIds)
    ).data?.map((d) => d.id) ?? [];

    if (dispatchIds.length === 0) return ok({ data: [], count: 0 });

    const { data, error, count } = await supabase
      .from("deliveries")
      .select(
        `
        *,
        dispatch:dispatches(*),
        driver:drivers(*),
        truck:trucks(*),
        material:materials(*),
        delivery_site:sites(*)
      `,
        { count: "exact" }
      )
      .in("dispatch_id", dispatchIds)
      .order("delivered_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    return ok({
      data: (data ?? []) as DeliveryWithRelations[],
      count: count ?? 0,
    });
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// SETTLEMENTS
// ---------------------------------------------------------------------------

export async function getCarrierSettlements(filters?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ActionResult<{ data: CarrierSettlement[]; count: number }>> {
  try {
    const { auth, carrier } = await getMyCarrier();
    if (!carrier) return ok({ data: [], count: 0 });

    if (isDemoMode()) {
      const { DEMO_SETTLEMENTS } = await import("@/lib/demo/data");
      let data = DEMO_SETTLEMENTS.filter(
        (s) => s.carrier_id === carrier.id
      );
      if (filters?.status) data = data.filter((s) => s.status === filters.status);
      return ok({ data, count: data.length });
    }

    const supabase = auth.supabase;
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 25;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("carrier_settlements")
      .select("*", { count: "exact" })
      .eq("carrier_id", carrier.id);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    query = query
      .order("period_end", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    return ok({
      data: (data ?? []) as CarrierSettlement[],
      count: count ?? 0,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function getCarrierSettlementById(
  id: string
): Promise<ActionResult<CarrierSettlementWithLines | null>> {
  try {
    const { auth, carrier } = await getMyCarrier();
    if (!carrier) return fail("No carrier account found");

    if (isDemoMode()) {
      const { DEMO_SETTLEMENTS_WITH_LINES } = await import("@/lib/demo/data");
      const settlement = DEMO_SETTLEMENTS_WITH_LINES.find(
        (s) => s.id === id && s.carrier_id === carrier.id
      );
      if (!settlement) return fail("Settlement not found");
      return ok(settlement);
    }

    const supabase = auth.supabase;

    const { data, error } = await supabase
      .from("carrier_settlements")
      .select(
        `
        *,
        carrier:carriers(*),
        lines:carrier_settlement_lines(
          *,
          delivery:deliveries(
            *,
            material:materials(*),
            delivery_site:sites(*)
          )
        )
      `
      )
      .eq("id", id)
      .eq("carrier_id", carrier.id)
      .single();

    if (error) throw new Error(error.message);
    if (!data) return fail("Settlement not found");

    return ok(data as unknown as CarrierSettlementWithLines);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// CREATE DISPATCH
// ---------------------------------------------------------------------------

export interface CreateDispatchInput {
  driver_id: string;
  truck_id: string;
  material_id: string;
  pickup_site_id: string;
  delivery_site_id: string;
  scheduled_date: string;
  purchase_order_id?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
}

export async function createDispatch(
  input: CreateDispatchInput
): Promise<ActionResult<DispatchWithRelations>> {
  try {
    const { auth, carrier } = await getMyCarrier();
    if (!carrier) return fail("No carrier account found");

    if (isDemoMode()) {
      return fail("Cannot create dispatches in demo mode");
    }

    const supabase = auth.supabase;

    // Verify driver belongs to this carrier
    const { data: driver, error: driverErr } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", input.driver_id)
      .eq("carrier_id", carrier.id)
      .single();

    if (driverErr || !driver) {
      return fail("Driver not found or does not belong to your carrier");
    }

    // Verify truck belongs to this carrier
    const { data: truck, error: truckErr } = await supabase
      .from("trucks")
      .select("*")
      .eq("id", input.truck_id)
      .eq("carrier_id", carrier.id)
      .single();

    if (truckErr || !truck) {
      return fail("Truck not found or does not belong to your carrier");
    }

    // Create the dispatch
    const { data: dispatch, error: createErr } = await supabase
      .from("dispatches")
      .insert({
        carrier_id: carrier.id,
        driver_id: input.driver_id,
        truck_id: input.truck_id,
        material_id: input.material_id,
        pickup_site_id: input.pickup_site_id,
        delivery_site_id: input.delivery_site_id,
        scheduled_date: input.scheduled_date,
        purchase_order_id: input.purchase_order_id ?? null,
        delivery_address: input.delivery_address ?? null,
        notes: input.notes ?? null,
        status: "dispatched" as const,
        dispatched_at: new Date().toISOString(),
        order_id: null,
        acknowledged_at: null,
      })
      .select(`
        *,
        order:orders(*),
        carrier:carriers(*),
        driver:drivers(*),
        truck:trucks(*),
        material:materials(*),
        pickup_site:sites!dispatches_pickup_site_id_fkey(*),
        delivery_site:sites!dispatches_delivery_site_id_fkey(*),
        purchase_order:purchase_orders(*)
      `)
      .single();

    if (createErr) throw new Error(createErr.message);

    revalidatePath("/subcontractor/dispatches");
    return ok(dispatch as unknown as DispatchWithRelations);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// CARRIER PO / DRIVER / TRUCK LOOKUPS (for dispatch form)
// ---------------------------------------------------------------------------

export async function getCarrierPurchaseOrders(): Promise<
  ActionResult<PurchaseOrderWithRelations[]>
> {
  try {
    const { auth, carrier } = await getMyCarrier();
    if (!carrier) return ok([]);

    if (isDemoMode()) {
      const { DEMO_PURCHASE_ORDERS_WITH_RELATIONS } = await import(
        "@/lib/demo/data"
      );
      const active = (DEMO_PURCHASE_ORDERS_WITH_RELATIONS ?? []).filter(
        (po: PurchaseOrderWithRelations) =>
          po.status === "active" && po.quantity_delivered < po.quantity_ordered
      );
      return ok(active);
    }

    const supabase = auth.supabase;

    const { data: pos, error } = await supabase
      .from("purchase_orders")
      .select(
        `*, customer:customers(*), material:materials(*), delivery_site:sites(*), parent_po:purchase_orders(*)`
      )
      .eq("status", "active");

    if (error) throw new Error(error.message);

    // Filter to only unfulfilled POs
    const unfulfilled = (pos ?? []).filter(
      (po) => po.quantity_delivered < po.quantity_ordered
    );

    return ok(unfulfilled as unknown as PurchaseOrderWithRelations[]);
  } catch (error) {
    return fail(error);
  }
}

export async function getCarrierDrivers(): Promise<ActionResult<Driver[]>> {
  try {
    const { auth, carrier } = await getMyCarrier();
    if (!carrier) return ok([]);

    if (isDemoMode()) {
      const { DEMO_DRIVERS } = await import("@/lib/demo/data");
      return ok(
        DEMO_DRIVERS.filter((d) => d.carrier_id === carrier.id) as Driver[]
      );
    }

    const supabase = auth.supabase;
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("carrier_id", carrier.id)
      .eq("status", "active");

    if (error) throw new Error(error.message);
    return ok((data ?? []) as Driver[]);
  } catch (error) {
    return fail(error);
  }
}

export async function getCarrierTrucks(): Promise<ActionResult<Truck[]>> {
  try {
    const { auth, carrier } = await getMyCarrier();
    if (!carrier) return ok([]);

    if (isDemoMode()) {
      const { DEMO_TRUCKS } = await import("@/lib/demo/data");
      return ok(
        DEMO_TRUCKS.filter((t) => t.carrier_id === carrier.id) as Truck[]
      );
    }

    const supabase = auth.supabase;
    const { data, error } = await supabase
      .from("trucks")
      .select("*")
      .eq("carrier_id", carrier.id)
      .eq("status", "active");

    if (error) throw new Error(error.message);
    return ok((data ?? []) as Truck[]);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------------------

export async function getMyNotifications(
  page: number = 1
): Promise<ActionResult<{ data: Notification[]; count: number }>> {
  try {
    const auth = await requireRole("carrier");
    const result = await notificationsData.getAll(auth.user.id, { page, limit: 20 });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

export async function markNotificationRead(notificationId: string): Promise<ActionResult<void>> {
  try {
    await requireRole("carrier");
    await notificationsData.markRead(notificationId);
    revalidatePath("/subcontractor");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult<void>> {
  try {
    const auth = await requireRole("carrier");
    await notificationsData.markAllRead(auth.user.id);
    revalidatePath("/subcontractor");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
