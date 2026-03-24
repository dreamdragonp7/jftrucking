"use server";

import { revalidatePath } from "next/cache";
import { requireRole, signOut } from "@/lib/supabase/auth";
import { isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import * as ordersData from "@/lib/data/orders.data";
import * as purchaseOrdersData from "@/lib/data/purchase-orders.data";
import * as deliveriesData from "@/lib/data/deliveries.data";
import * as invoicesData from "@/lib/data/invoices.data";
import * as paymentsData from "@/lib/data/payments.data";
import * as notificationsData from "@/lib/data/notifications.data";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type {
  OrderWithRelations,
  PurchaseOrderWithRelations,
  DeliveryWithRelations,
  InvoiceWithLineItems,
  Invoice,
  PaymentWithRelations,
  Notification,
  Site,
  Material,
  Customer,
  CustomerAddress,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Sign out wrapper — safe to use as a Server Action prop
// ---------------------------------------------------------------------------

export async function signOutAction() {
  await signOut();
}

// ---------------------------------------------------------------------------
// Helper: get the customer record linked to the logged-in profile
// ---------------------------------------------------------------------------

async function getMyCustomer() {
  const auth = await requireRole("customer");

  // Demo mode: return demo customer data without querying Supabase
  if (isDemoMode()) {
    const { DEMO_CUSTOMERS } = await import("@/lib/demo/data");
    const customer =
      DEMO_CUSTOMERS.find(
        (c) => c.name === auth.profile.company_name && c.status === "active"
      ) ?? DEMO_CUSTOMERS[0];
    return { auth, customer: customer as Customer };
  }

  const supabase = auth.supabase;

  // Prefer the customer_id FK on profiles (added in migration 010)
  if (auth.profile.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("id", auth.profile.customer_id)
      .eq("status", "active")
      .maybeSingle();

    if (customer) {
      return { auth, customer: customer as Customer };
    }
  }

  // Fall back to string matching by company_name (legacy)
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("name", auth.profile.company_name ?? "")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return { auth, customer };
}

// ---------------------------------------------------------------------------
// ORDERS
// ---------------------------------------------------------------------------

export async function getMyOrders(): Promise<ActionResult<OrderWithRelations[]>> {
  try {
    const { customer } = await getMyCustomer();
    if (!customer) return ok([]);

    const result = await ordersData.getAll({ customer_id: customer.id, limit: 100 });
    return ok(result.data);
  } catch (error) {
    return fail(error);
  }
}

export async function getMyPurchaseOrders(): Promise<ActionResult<PurchaseOrderWithRelations[]>> {
  try {
    const { customer } = await getMyCustomer();
    if (!customer) return ok([]);

    const result = await purchaseOrdersData.getAll({ customer_id: customer.id, limit: 100 });
    return ok(result.data);
  } catch (error) {
    return fail(error);
  }
}

export interface CreateOrderInput {
  po_number: string;
  material_id: string;
  delivery_site_id: string;
  requested_loads: number;
  scheduled_date: string;
  notes?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<ActionResult<{ orderId: string }>> {
  try {
    const { auth, customer } = await getMyCustomer();
    if (!customer) return fail("No customer account linked to your profile");

    if (isDemoMode()) {
      return ok({ orderId: "demo-order-id" }); // Demo mode: pretend it worked
    }

    const supabase = auth.supabase;

    // Find or create a pickup site (quarry) — use the first quarry site
    const { data: quarries } = await supabase
      .from("sites")
      .select("id")
      .eq("type", "quarry")
      .eq("status", "active")
      .limit(1);

    const pickupSiteId = quarries?.[0]?.id;
    if (!pickupSiteId) return fail("No pickup site configured. Please contact J Fudge Trucking.");

    // Create or find the PO
    let purchaseOrder = await purchaseOrdersData.getAll({
      customer_id: customer.id,
      search: input.po_number,
    });

    let poId: string;
    const existingPo = purchaseOrder.data.find(po => po.po_number === input.po_number);

    if (existingPo) {
      poId = existingPo.id;
    } else {
      // Create new PO
      const newPo = await purchaseOrdersData.create({
        customer_id: customer.id,
        po_number: input.po_number,
        material_id: input.material_id,
        delivery_site_id: input.delivery_site_id,
        quantity_ordered: input.requested_loads,
        unit: "load",
        status: "active",
        notes: input.notes ?? null,
      });
      poId = newPo.id;
    }

    // Create the order
    const order = await ordersData.create({
      customer_id: customer.id,
      purchase_order_id: poId,
      material_id: input.material_id,
      pickup_site_id: pickupSiteId,
      delivery_site_id: input.delivery_site_id,
      requested_loads: input.requested_loads,
      scheduled_date: input.scheduled_date,
      status: "pending",
      notes: input.notes ?? null,
      created_by: auth.user.id,
    });

    // Notify admin about new order
    try {
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .eq("status", "active");

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: "po_threshold" as const,
          title: "New Customer Order",
          message: `${customer.name} placed a new order: ${input.requested_loads} loads of material (PO #${input.po_number})`,
          channel: "in_app" as const,
          read: false,
          read_at: null,
          data: { order_id: order.id, customer_id: customer.id },
        }));
        await notificationsData.createBulk(notifications);
      }
    } catch (notifErr) {
      console.warn("[Customer] Failed to send new order notification:", notifErr instanceof Error ? notifErr.message : notifErr);
    }

    revalidatePath("/customer/orders");
    revalidatePath("/admin/orders");

    return ok({ orderId: order.id });
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// DELIVERIES — the confirmation system
// ---------------------------------------------------------------------------

export async function getPendingDeliveries(): Promise<ActionResult<DeliveryWithRelations[]>> {
  try {
    const { customer } = await getMyCustomer();
    if (!customer) return ok([]);

    const deliveries = await deliveriesData.getPendingForCustomer(customer.id);
    return ok(deliveries);
  } catch (error) {
    return fail(error);
  }
}

export async function getConfirmedDeliveries(
  page: number = 1,
  limit: number = 20
): Promise<ActionResult<{ data: DeliveryWithRelations[]; count: number }>> {
  try {
    const { customer, auth } = await getMyCustomer();
    if (!customer) return ok({ data: [], count: 0 });

    if (isDemoMode()) {
      const { DEMO_DELIVERIES_WITH_RELATIONS } = await import("@/lib/demo/data");
      const data = DEMO_DELIVERIES_WITH_RELATIONS.filter(
        (d) => d.confirmation_status !== "pending"
      );
      return ok({ data, count: data.length });
    }

    const supabase = auth.supabase;

    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("deliveries")
      .select(`
        *,
        dispatch:dispatches!inner(
          *,
          purchase_order:purchase_orders!inner(customer_id),
          material:materials(*),
          delivery_site:sites!dispatches_delivery_site_id_fkey(*)
        ),
        driver:drivers(*),
        truck:trucks(*),
        material:materials(*),
        delivery_site:sites(*)
      `, { count: "exact" })
      .eq("dispatch.purchase_order.customer_id", customer.id)
      .neq("confirmation_status", "pending")
      .order("delivered_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    return ok({ data: (data ?? []) as DeliveryWithRelations[], count: count ?? 0 });
  } catch (error) {
    return fail(error);
  }
}

export async function confirmDelivery(deliveryId: string): Promise<ActionResult<void>> {
  try {
    const { auth, customer } = await getMyCustomer();
    if (!customer) return fail("No customer account found");

    if (isDemoMode()) {
      return ok(undefined); // Demo mode: pretend it worked
    }

    // Verify delivery belongs to this customer
    const delivery = await deliveriesData.getById(deliveryId);
    if (!delivery) return fail("Delivery not found");

    // Check if already processed
    if (delivery.confirmation_status !== "pending") {
      return fail("This delivery has already been processed");
    }

    // Verify via dispatch -> PO -> customer chain
    const supabase = auth.supabase;
    const { data: dispatch } = await supabase
      .from("dispatches")
      .select("purchase_order:purchase_orders(customer_id)")
      .eq("id", delivery.dispatch_id)
      .single();

    // purchase_order can come back as an object or array depending on query shape
    const po = dispatch?.purchase_order;
    const poObj = Array.isArray(po) ? po[0] : po;
    const poCustomerId = (poObj as { customer_id: string } | null | undefined)?.customer_id;
    if (poCustomerId !== customer.id) {
      return fail("This delivery does not belong to your account");
    }

    await deliveriesData.confirm(deliveryId, auth.user.id);

    // Also update the dispatch status
    await supabase
      .from("dispatches")
      .update({ status: "confirmed" })
      .eq("id", delivery.dispatch_id);

    revalidatePath("/customer/deliveries");
    revalidatePath("/admin/deliveries");

    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function disputeDelivery(
  deliveryId: string,
  reason: string,
  notes?: string
): Promise<ActionResult<void>> {
  try {
    const { auth, customer } = await getMyCustomer();
    if (!customer) return fail("No customer account found");

    if (isDemoMode()) {
      return ok(undefined); // Demo mode: pretend it worked
    }

    // Verify delivery belongs to this customer
    const delivery = await deliveriesData.getById(deliveryId);
    if (!delivery) return fail("Delivery not found");

    // Check if already processed
    if (delivery.confirmation_status !== "pending") {
      return fail("This delivery has already been processed");
    }

    const supabase = auth.supabase;
    const { data: dispatch } = await supabase
      .from("dispatches")
      .select("purchase_order:purchase_orders(customer_id)")
      .eq("id", delivery.dispatch_id)
      .single();

    // purchase_order can come back as an object or array depending on query shape
    const po = dispatch?.purchase_order;
    const poObj = Array.isArray(po) ? po[0] : po;
    const poCustomerId = (poObj as { customer_id: string } | null | undefined)?.customer_id;
    if (poCustomerId !== customer.id) {
      return fail("This delivery does not belong to your account");
    }

    const fullReason = notes ? `${reason}: ${notes}` : reason;
    await deliveriesData.dispute(deliveryId, fullReason);

    // Update dispatch status
    await supabase
      .from("dispatches")
      .update({ status: "disputed" })
      .eq("id", delivery.dispatch_id);

    // Notify admins about dispute
    try {
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .eq("status", "active");

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: "delivery_disputed" as const,
          title: "Delivery Disputed",
          message: `${customer.name} disputed delivery #${delivery.ticket_number ?? deliveryId.slice(0, 8)}: ${reason}`,
          channel: "in_app" as const,
          read: false,
          read_at: null,
          data: { delivery_id: deliveryId, customer_id: customer.id, reason },
        }));
        await notificationsData.createBulk(notifications);
      }
    } catch (notifErr) {
      console.warn("[Customer] Failed to send dispute notification:", notifErr instanceof Error ? notifErr.message : notifErr);
    }

    revalidatePath("/customer/deliveries");
    revalidatePath("/admin/deliveries");

    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// INVOICES
// ---------------------------------------------------------------------------

export async function getMyInvoices(): Promise<ActionResult<Invoice[]>> {
  try {
    const { customer } = await getMyCustomer();
    if (!customer) return ok([]);

    const result = await invoicesData.getAll({ customer_id: customer.id, limit: 100 });
    return ok(result.data);
  } catch (error) {
    return fail(error);
  }
}

export async function getInvoiceById(id: string): Promise<ActionResult<InvoiceWithLineItems | null>> {
  try {
    const { customer } = await getMyCustomer();
    if (!customer) return fail("No customer account found");

    const invoice = await invoicesData.getById(id);
    if (!invoice) return fail("Invoice not found");

    // Verify invoice belongs to this customer
    if (invoice.customer_id !== customer.id) {
      return fail("This invoice does not belong to your account");
    }

    return ok(invoice);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// PAYMENTS
// ---------------------------------------------------------------------------

export async function getMyPayments(): Promise<ActionResult<PaymentWithRelations[]>> {
  try {
    const { customer } = await getMyCustomer();
    if (!customer) return ok([]);

    const result = await paymentsData.getAll({ customer_id: customer.id, limit: 100 });
    return ok(result.data);
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
    const auth = await requireRole("customer");
    const result = await notificationsData.getAll(auth.user.id, { page, limit: 20 });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

export async function markNotificationRead(notificationId: string): Promise<ActionResult<void>> {
  try {
    await requireRole("customer");
    await notificationsData.markRead(notificationId);
    revalidatePath("/customer");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult<void>> {
  try {
    const auth = await requireRole("customer");
    await notificationsData.markAllRead(auth.user.id);
    revalidatePath("/customer");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// CUSTOMER ADDRESSES — saved delivery addresses
// ---------------------------------------------------------------------------

export async function getCustomerAddresses(): Promise<ActionResult<CustomerAddress[]>> {
  try {
    const { auth, customer } = await getMyCustomer();
    if (!customer) return ok([]);

    if (isDemoMode()) {
      return ok([]); // No demo addresses
    }

    const supabase = auth.supabase;
    const { data, error } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customer.id)
      .order("is_default", { ascending: false })
      .order("label", { ascending: true });

    if (error) throw new Error(error.message);
    return ok((data ?? []) as CustomerAddress[]);
  } catch (error) {
    return fail(error);
  }
}

export async function addCustomerAddress(input: {
  label: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}): Promise<ActionResult<CustomerAddress>> {
  try {
    const { auth, customer } = await getMyCustomer();
    if (!customer) return fail("No customer account found");

    if (isDemoMode()) {
      return fail("Cannot add addresses in demo mode");
    }

    const supabase = auth.supabase;

    const { data, error } = await supabase
      .from("customer_addresses")
      .insert({
        customer_id: customer.id,
        label: input.label || null,
        address: input.address,
        city: input.city || null,
        state: input.state || null,
        zip: input.zip || null,
        is_default: false,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/customer/settings");
    return ok(data as CustomerAddress);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteCustomerAddress(id: string): Promise<ActionResult<void>> {
  try {
    const { auth, customer } = await getMyCustomer();
    if (!customer) return fail("No customer account found");

    if (isDemoMode()) {
      return fail("Cannot delete addresses in demo mode");
    }

    const supabase = auth.supabase;

    // Verify the address belongs to this customer
    const { data: existing } = await supabase
      .from("customer_addresses")
      .select("customer_id")
      .eq("id", id)
      .single();

    if (!existing || existing.customer_id !== customer.id) {
      return fail("Address not found");
    }

    const { error } = await supabase
      .from("customer_addresses")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/customer/settings");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function setDefaultAddress(id: string): Promise<ActionResult<void>> {
  try {
    const { auth, customer } = await getMyCustomer();
    if (!customer) return fail("No customer account found");

    if (isDemoMode()) {
      return fail("Cannot update addresses in demo mode");
    }

    const supabase = auth.supabase;

    // Verify the address belongs to this customer
    const { data: existing } = await supabase
      .from("customer_addresses")
      .select("customer_id")
      .eq("id", id)
      .single();

    if (!existing || existing.customer_id !== customer.id) {
      return fail("Address not found");
    }

    // Clear the old default
    const { error: clearErr } = await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", customer.id)
      .eq("is_default", true);

    if (clearErr) {
      throw new Error(`Failed to clear old default address: ${clearErr.message}`);
    }

    // Set the new default
    const { error } = await supabase
      .from("customer_addresses")
      .update({ is_default: true })
      .eq("id", id);

    if (error) {
      // Attempt to restore: we already cleared the old default, but setting the new one failed.
      // Try to restore the old default by setting THIS address back (best effort).
      console.error("[Customer] Failed to set new default address, attempting rollback:", error.message);
      try {
        // We don't know which was the old default, so just log the inconsistency
        // The user can retry. At minimum, they'll see no default and can set one.
      } catch {
        // Rollback also failed — logged above
      }
      throw new Error(`Failed to set default address: ${error.message}`);
    }

    revalidatePath("/customer/settings");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// CUSTOMER PROFILE / SITES / MATERIALS (for forms)
// ---------------------------------------------------------------------------

export async function getMySites(): Promise<ActionResult<Site[]>> {
  try {
    const { customer } = await getMyCustomer();
    if (!customer) return ok([]);

    if (isDemoMode()) {
      const { DEMO_SITES } = await import("@/lib/demo/data");
      return ok(
        DEMO_SITES.filter(
          (s) => s.customer_id === customer.id && s.status === "active"
        )
      );
    }

    const supabase = (await createClient())!;
    const { data, error } = await supabase
      .from("sites")
      .select("*")
      .eq("customer_id", customer.id)
      .eq("status", "active")
      .order("name");

    if (error) throw new Error(error.message);
    return ok((data ?? []) as Site[]);
  } catch (error) {
    return fail(error);
  }
}

export async function getActiveMaterials(): Promise<ActionResult<Material[]>> {
  try {
    await requireRole("customer");

    if (isDemoMode()) {
      const { DEMO_MATERIALS } = await import("@/lib/demo/data");
      return ok(DEMO_MATERIALS.filter((m) => m.status === "active"));
    }

    const supabase = await createClient();
    if (!supabase) return ok([]);

    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("status", "active")
      .order("name");

    if (error) throw new Error(error.message);
    return ok((data ?? []) as Material[]);
  } catch (error) {
    return fail(error);
  }
}

export async function getMyCustomerProfile(): Promise<ActionResult<Customer | null>> {
  try {
    const { customer } = await getMyCustomer();
    return ok(customer);
  } catch (error) {
    return fail(error);
  }
}

export async function updateMyProfile(data: {
  phone?: string;
  full_name?: string;
}): Promise<ActionResult<void>> {
  try {
    const auth = await requireRole("customer");

    if (isDemoMode()) {
      return ok(undefined); // Demo mode: pretend it worked
    }

    const supabase = auth.supabase;

    const updates: Record<string, string> = {};
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.full_name !== undefined) updates.full_name = data.full_name;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", auth.user.id);

      if (error) throw new Error(error.message);
    }

    revalidatePath("/customer/settings");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
