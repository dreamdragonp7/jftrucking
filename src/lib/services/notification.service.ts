import { createClient } from "@/lib/supabase/server";
import * as notificationsData from "@/lib/data/notifications.data";
import type { Delivery, DeliveryWithRelations } from "@/types/database";

/**
 * Notification service — handles multi-channel notifications.
 * Sends in-app notifications always, SMS via Twilio when configured.
 * Gracefully handles missing Twilio config.
 */

// ---------------------------------------------------------------------------
// Twilio SMS (optional — graceful fallback if not configured)
// ---------------------------------------------------------------------------

function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
  );
}

async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!isTwilioConfigured()) {
    console.log("[notification] Twilio not configured. SMS skipped:", body);
    return false;
  }

  try {
    // Dynamic import so Twilio is only loaded when configured
    const twilio = await import("twilio");
    const client = twilio.default(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    await client.messages.create({
      to,
      from: process.env.TWILIO_PHONE_NUMBER!,
      body,
    });

    console.log("[notification] SMS sent to", to);
    return true;
  } catch (error) {
    console.error("[notification] Failed to send SMS:", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Notify customer about a completed delivery
// ---------------------------------------------------------------------------

export async function notifyCustomerDelivery(
  delivery: Delivery | DeliveryWithRelations
): Promise<void> {
  try {
    const supabase = await createClient();
    if (!supabase) return;

    // Get the dispatch → PO → customer chain
    const { data: dispatch } = await supabase
      .from("dispatches")
      .select(`
        *,
        purchase_order:purchase_orders(customer_id, po_number),
        material:materials(name),
        delivery_site:sites!dispatches_delivery_site_id_fkey(name)
      `)
      .eq("id", delivery.dispatch_id)
      .single();

    if (!dispatch?.purchase_order) return;

    const customerId = (dispatch.purchase_order as { customer_id: string }).customer_id;
    const poNumber = (dispatch.purchase_order as { po_number: string }).po_number;
    const materialName = (dispatch.material as { name: string } | null)?.name ?? "material";
    const siteName = (dispatch.delivery_site as { name: string } | null)?.name ?? "your site";

    // Find the customer's profile for in-app notification
    const { data: customer } = await supabase
      .from("customers")
      .select("name, phone")
      .eq("id", customerId)
      .single();

    // Find customer portal users (profiles with this company name)
    const { data: customerProfiles } = await supabase
      .from("profiles")
      .select("id, phone, company_name")
      .eq("company_name", customer?.name ?? "")
      .eq("role", "customer")
      .eq("status", "active");

    const ticketRef = delivery.ticket_number
      ? `#${delivery.ticket_number}`
      : `D-${delivery.id.slice(0, 6)}`;

    const weightStr = delivery.net_weight
      ? `${delivery.net_weight.toFixed(1)} tons`
      : "";

    // Create in-app notifications for all customer portal users
    if (customerProfiles && customerProfiles.length > 0) {
      const notifications = customerProfiles.map((profile) => ({
        user_id: profile.id,
        type: "delivery_confirmed" as const,
        title: "Delivery Pending Confirmation",
        message: `Load ${ticketRef} delivered${weightStr ? ` — ${weightStr}` : ""} ${materialName} to ${siteName}. Please confirm or dispute.`,
        channel: "in_app" as const,
        read: false,
        read_at: null,
        data: {
          delivery_id: delivery.id,
          dispatch_id: delivery.dispatch_id,
          po_number: poNumber,
        },
      }));

      await notificationsData.createBulk(notifications);
    }

    // Send SMS to the customer's phone number
    const customerPhone = customer?.phone;
    if (customerPhone) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const smsBody = `JFT: Load ${ticketRef} delivered${weightStr ? ` — ${weightStr}` : ""} ${materialName} to ${siteName}. Reply YES to confirm or DISPUTE. Details: ${appUrl}/customer/deliveries`;

      await sendSMS(customerPhone, smsBody);
    }

    // Also try sending to individual profile phone numbers
    if (customerProfiles) {
      for (const profile of customerProfiles) {
        if (profile.phone && profile.phone !== customerPhone) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
          const smsBody = `JFT: Load ${ticketRef} delivered${weightStr ? ` — ${weightStr}` : ""} ${materialName} to ${siteName}. Reply YES to confirm or DISPUTE. Details: ${appUrl}/customer/deliveries`;
          await sendSMS(profile.phone, smsBody);
        }
      }
    }
  } catch (error) {
    console.error("[notification] Failed to notify customer about delivery:", error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Notify admin about a dispute
// ---------------------------------------------------------------------------

export async function notifyAdminDispute(
  deliveryId: string,
  customerName: string,
  reason: string
): Promise<void> {
  try {
    const supabase = await createClient();
    if (!supabase) return;

    const { data: admins } = await supabase
      .from("profiles")
      .select("id, phone")
      .eq("role", "admin")
      .eq("status", "active");

    if (!admins || admins.length === 0) return;

    // In-app notification
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      type: "delivery_disputed" as const,
      title: "Delivery Disputed",
      message: `${customerName} disputed a delivery: ${reason}`,
      channel: "in_app" as const,
      read: false,
      read_at: null,
      data: { delivery_id: deliveryId, reason },
    }));

    await notificationsData.createBulk(notifications);

    // SMS to admins
    for (const admin of admins) {
      if (admin.phone) {
        await sendSMS(
          admin.phone,
          `JFT ALERT: ${customerName} disputed a delivery. Reason: ${reason}. Check admin portal for details.`
        );
      }
    }
  } catch (error) {
    console.error("[notification] Failed to notify admin about dispute:", error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Notify admin about a new customer order
// ---------------------------------------------------------------------------

export async function notifyAdminNewOrder(
  customerName: string,
  poNumber: string,
  loads: number,
  orderId: string
): Promise<void> {
  try {
    const supabase = await createClient();
    if (!supabase) return;

    const { data: admins } = await supabase
      .from("profiles")
      .select("id, phone")
      .eq("role", "admin")
      .eq("status", "active");

    if (!admins || admins.length === 0) return;

    // In-app notification
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      type: "po_threshold" as const,
      title: "New Customer Order",
      message: `${customerName} ordered ${loads} loads (PO #${poNumber})`,
      channel: "in_app" as const,
      read: false,
      read_at: null,
      data: { order_id: orderId, po_number: poNumber },
    }));

    await notificationsData.createBulk(notifications);

    // SMS to admin
    for (const admin of admins) {
      if (admin.phone) {
        await sendSMS(
          admin.phone,
          `JFT: New order from ${customerName} — ${loads} loads, PO #${poNumber}`
        );
      }
    }
  } catch (error) {
    console.error("[notification] Failed to notify admin about new order:", error);
    throw error;
  }
}
