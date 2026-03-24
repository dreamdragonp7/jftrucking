import { NextResponse, type NextRequest } from "next/server";
import { createHmac } from "crypto";

/**
 * POST /api/qb/webhook
 *
 * QuickBooks webhook handler.
 * Receives event notifications from QuickBooks Online.
 * Verifies the webhook signature (HMAC-SHA256) and processes events.
 *
 * Events handled:
 * - Payment: When Horton pays an invoice → update invoice status in Supabase
 * - Bill: When a bill is updated in QBO
 * - Vendor: When vendor info changes
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("intuit-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing webhook signature" },
      { status: 401 }
    );
  }

  const body = await request.text();

  // Verify HMAC-SHA256 signature
  const webhookVerifierToken = process.env.QB_WEBHOOK_TOKEN;
  if (!webhookVerifierToken) {
    console.warn("[QB Webhook] QB_WEBHOOK_TOKEN not configured — cannot verify signature");
    return NextResponse.json(
      { error: "Webhook verification not configured" },
      { status: 500 }
    );
  }

  const hash = createHmac("sha256", webhookVerifierToken)
    .update(body)
    .digest("base64");

  if (hash !== signature) {
    console.error("[QB Webhook] Signature verification failed");
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  // Parse webhook payload
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  console.log("[QB Webhook] Received verified event");

  // Process events asynchronously (respond 200 quickly to avoid webhook retries)
  // QuickBooks expects a 200 response within 10 seconds
  try {
    await processWebhookEvents(payload);
  } catch (err) {
    // Log but still return 200 — QB retries on non-200
    console.error("[QB Webhook] Error processing events:", err);
  }

  return NextResponse.json({ status: "received" });
}

// ---------------------------------------------------------------------------
// Event processing
// ---------------------------------------------------------------------------

interface QBWebhookPayload {
  eventNotifications?: Array<{
    realmId: string;
    dataChangeEvent?: {
      entities: Array<{
        name: string; // "Invoice", "Payment", "Bill", "Vendor", etc.
        id: string;
        operation: string; // "Create", "Update", "Delete", "Void"
        lastUpdated: string;
      }>;
    };
  }>;
}

async function processWebhookEvents(payload: QBWebhookPayload): Promise<void> {
  const notifications = payload.eventNotifications ?? [];

  for (const notification of notifications) {
    const entities = notification.dataChangeEvent?.entities ?? [];

    for (const entity of entities) {
      console.log(
        `[QB Webhook] Processing: ${entity.name} ${entity.id} (${entity.operation})`
      );

      try {
        switch (entity.name) {
          case "Payment":
            await handlePaymentEvent(entity.id, entity.operation);
            break;

          case "Invoice":
            await handleInvoiceEvent(entity.id, entity.operation);
            break;

          case "Bill":
            await handleBillEvent(entity.id, entity.operation);
            break;

          case "Vendor":
            await handleVendorEvent(entity.id, entity.operation);
            break;

          default:
            console.log(
              `[QB Webhook] Unhandled entity type: ${entity.name}`
            );
        }
      } catch (err) {
        console.error(
          `[QB Webhook] Error processing ${entity.name} ${entity.id}:`,
          err
        );

        // Log to qb_sync_log
        try {
          const { createAdminClient } = await import("@/lib/supabase/admin");
          const supabase = createAdminClient();
          if (supabase) {
            await supabase.from("qb_sync_log").insert({
              entity_type: `webhook_${entity.name.toLowerCase()}`,
              entity_id: entity.id,
              action: "update" as const,
              qb_entity_type: entity.name,
              qb_entity_id: entity.id,
              status: "failed" as const,
              error_message:
                err instanceof Error ? err.message : "Unknown error",
            });
          }
        } catch (logErr) {
          console.warn("[QB Webhook] Failed to write error to sync log:", logErr instanceof Error ? logErr.message : logErr);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Event Handlers
// ---------------------------------------------------------------------------

/**
 * Handle Payment events — when Horton pays an invoice via QBO.
 * Fetch the full payment from QBO and update TMS records.
 */
async function handlePaymentEvent(
  qbPaymentId: string,
  operation: string
): Promise<void> {
  if (operation === "Delete" || operation === "Void") {
    console.log(
      `[QB Webhook] Payment ${qbPaymentId} was ${operation.toLowerCase()}d — manual review needed`
    );
    return;
  }

  const { syncPaymentFromQBO } = await import(
    "@/lib/services/quickbooks.service"
  );
  const result = await syncPaymentFromQBO(qbPaymentId);

  if (result.success) {
    console.log(`[QB Webhook] Payment ${qbPaymentId} synced successfully`);
  } else {
    console.error(
      `[QB Webhook] Payment ${qbPaymentId} sync failed: ${result.error}`
    );
  }
}

/**
 * Handle Invoice events — when an invoice is updated in QBO.
 * Check if payment status changed.
 */
async function handleInvoiceEvent(
  qbInvoiceId: string,
  operation: string
): Promise<void> {
  if (operation === "Delete" || operation === "Void") {
    console.log(
      `[QB Webhook] Invoice ${qbInvoiceId} was ${operation.toLowerCase()}d`
    );

    // Update TMS invoice status if it was voided
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    if (!supabase) {
      console.warn("[QB Webhook] Supabase admin client not configured, skipping event");
      return;
    }

    const { error: cancelErr } = await supabase
      .from("invoices")
      .update({ status: "cancelled" })
      .eq("qb_invoice_id", qbInvoiceId);

    if (cancelErr) {
      console.error("[QB Webhook] Failed to cancel invoice for QB invoice", qbInvoiceId, cancelErr.message);
    }

    return;
  }

  // For Create/Update, fetch the invoice to check its balance
  try {
    const { getClient } = await import("@/lib/integrations/quickbooks/client");
    const qb = await getClient();
    if (!qb) {
      console.warn("[QB Webhook] QB client not available, skipping event");
      return;
    }

    const qbInvoice = await qb.getInvoice(qbInvoiceId);
    if (!qbInvoice) return;

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    if (!supabase) {
      console.warn("[QB Webhook] Supabase admin client not configured, skipping event");
      return;
    }

    // If balance is 0, mark as paid
    if (qbInvoice.Balance === 0 || qbInvoice.Balance === "0") {
      const { error: paidErr } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("qb_invoice_id", qbInvoiceId)
        .neq("status", "paid");

      if (paidErr) {
        console.error("[QB Webhook] Failed to mark invoice as paid:", qbInvoiceId, paidErr.message);
      } else {
        console.log(`[QB Webhook] Invoice ${qbInvoiceId} marked as paid`);
      }
    }
  } catch (err) {
    console.error(
      `[QB Webhook] Failed to check invoice ${qbInvoiceId} status:`,
      err
    );
  }
}

/**
 * Handle Bill events — when a bill is updated in QBO.
 */
async function handleBillEvent(
  qbBillId: string,
  operation: string
): Promise<void> {
  console.log(
    `[QB Webhook] Bill ${qbBillId} ${operation} — logged for reconciliation`
  );

  // Log the event for reconciliation review
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  if (!supabase) {
    console.warn("[QB Webhook] Supabase admin client not configured, skipping event");
    return;
  }

  const { error: billLogErr } = await supabase.from("qb_sync_log").insert({
    entity_type: "webhook_bill",
    entity_id: qbBillId,
    action: "update" as const,
    qb_entity_type: "Bill",
    qb_entity_id: qbBillId,
    status: "success" as const,
  });

  if (billLogErr) {
    console.error("[QB Webhook] Failed to log bill event:", qbBillId, billLogErr.message);
  }
}

/**
 * Handle Vendor events — when vendor info changes in QBO.
 */
async function handleVendorEvent(
  qbVendorId: string,
  operation: string
): Promise<void> {
  console.log(
    `[QB Webhook] Vendor ${qbVendorId} ${operation} — logged for review`
  );

  // Log the event
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  if (!supabase) {
    console.warn("[QB Webhook] Supabase admin client not configured, skipping event");
    return;
  }

  const { error: vendorLogErr } = await supabase.from("qb_sync_log").insert({
    entity_type: "webhook_vendor",
    entity_id: qbVendorId,
    action: "update" as const,
    qb_entity_type: "Vendor",
    qb_entity_id: qbVendorId,
    status: "success" as const,
  });

  if (vendorLogErr) {
    console.error("[QB Webhook] Failed to log vendor event:", qbVendorId, vendorLogErr.message);
  }
}
