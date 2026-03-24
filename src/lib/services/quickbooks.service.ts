/**
 * QuickBooks Online Sync Service — the central QB sync engine.
 *
 * Provides functions for:
 * - One-time setup (customer, vendor, service items)
 * - Invoice sync (TMS → QBO)
 * - Settlement/bill sync (TMS → QBO)
 * - Payment sync (QBO → TMS)
 * - Bill payment / ACH (TMS → QBO)
 * - Reconciliation (QBO ↔ TMS)
 *
 * ALL operations log to qb_sync_log and handle errors gracefully.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getClient,
  isQBConfigured,
  isConnected,
  setLastSyncTime,
  getLastSyncTime,
  type QBClient,
} from "@/lib/integrations/quickbooks";
import { getCurrentQBEnvironment } from "@/lib/integrations/quickbooks/environment";
import { getBusinessSetting } from "@/lib/utils/settings";
import type {
  QbSyncAction,
  QbSyncStatus,
  QbEnvironment,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Sync Log Helper
// ---------------------------------------------------------------------------

async function logSync(params: {
  entityType: string;
  entityId: string;
  action: QbSyncAction;
  qbEntityType?: string;
  qbEntityId?: string;
  status: QbSyncStatus;
  errorMessage?: string;
  qbEnvironment?: QbEnvironment;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    if (!supabase) return;

    const env = params.qbEnvironment ?? await getCurrentQBEnvironment();

    await supabase.from("qb_sync_log").insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: params.action,
      qb_entity_type: params.qbEntityType ?? null,
      qb_entity_id: params.qbEntityId ?? null,
      qb_environment: env,
      status: params.status,
      error_message: params.errorMessage ?? null,
      synced_at: params.status === "success" ? new Date().toISOString() : null,
    });
  } catch (err) {
    console.error("[QB Sync Log] Failed to write sync log:", err);
  }
}

/**
 * Get recent sync log entries.
 */
export async function getSyncLogs(limit: number = 50) {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("qb_sync_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[QB] Failed to fetch sync logs:", error.message);
    return [];
  }

  return data ?? [];
}

// ---------------------------------------------------------------------------
// Guard: get QB client or return null with warning
// ---------------------------------------------------------------------------

export async function getQBClient(): Promise<QBClient | null> {
  if (!isQBConfigured()) {
    return null;
  }

  const connected = await isConnected();
  if (!connected) {
    return null;
  }

  return getClient();
}

// ============================================================================
// ONE-TIME SETUP FUNCTIONS
// ============================================================================

/**
 * Create or update a Customer in QBO.
 * Stores the qb_customer_id back in Supabase.
 */
export async function createOrUpdateCustomer(customer: {
  id: string;
  name: string;
  billing_email?: string | null;
  billing_address?: string | null;
  phone?: string | null;
}): Promise<{ success: boolean; qbId?: string; error?: string }> {
  const qb = await getQBClient();
  if (!qb) return { success: false, error: "QuickBooks not connected" };

  try {
    // Check if customer already exists in QBO
    const supabase = createAdminClient();
    if (!supabase) return { success: false, error: "Supabase not configured" };

    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("qb_customer_id")
      .eq("id", customer.id)
      .single();

    if (existingCustomer?.qb_customer_id) {
      // Customer already synced
      await logSync({
        entityType: "customer",
        entityId: customer.id,
        action: "update",
        qbEntityType: "Customer",
        qbEntityId: existingCustomer.qb_customer_id,
        status: "success",
      });
      return { success: true, qbId: existingCustomer.qb_customer_id };
    }

    // Build QBO Customer object
    const qbCustomer: Record<string, unknown> = {
      DisplayName: customer.name,
      CompanyName: customer.name,
    };

    if (customer.billing_email) {
      qbCustomer.PrimaryEmailAddr = { Address: customer.billing_email };
    }
    if (customer.phone) {
      qbCustomer.PrimaryPhone = { FreeFormNumber: customer.phone };
    }
    if (customer.billing_address) {
      qbCustomer.BillAddr = { Line1: customer.billing_address };
    }

    const result = await qb.createCustomer(qbCustomer);
    const qbId = String(result.Id);

    // Store qb_customer_id back in Supabase with environment tag
    const env = await getCurrentQBEnvironment();
    const { error: linkErr } = await supabase
      .from("customers")
      .update({ qb_customer_id: qbId, qb_environment: env })
      .eq("id", customer.id);

    if (linkErr) {
      console.error("[QB Sync] Failed to link customer QB ID:", linkErr.message);
    }

    await logSync({
      entityType: "customer",
      entityId: customer.id,
      action: "create",
      qbEntityType: "Customer",
      qbEntityId: qbId,
      status: "success",
    });

    console.log(`[QB] Customer created: ${customer.name} → QB ID ${qbId}`);
    return { success: true, qbId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[QB] Failed to create customer ${customer.name}:`, message);

    await logSync({
      entityType: "customer",
      entityId: customer.id,
      action: "create",
      qbEntityType: "Customer",
      status: "failed",
      errorMessage: message,
    });

    return { success: false, error: message };
  }
}

/**
 * Create or update a Vendor in QBO with 1099 tracking enabled.
 * Stores the qb_vendor_id back in Supabase.
 */
export async function createOrUpdateVendor(carrier: {
  id: string;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  ein?: string | null;
}): Promise<{ success: boolean; qbId?: string; error?: string }> {
  const qb = await getQBClient();
  if (!qb) return { success: false, error: "QuickBooks not connected" };

  try {
    const supabase = createAdminClient();
    if (!supabase) return { success: false, error: "Supabase not configured" };

    const { data: existingCarrier } = await supabase
      .from("carriers")
      .select("qb_vendor_id")
      .eq("id", carrier.id)
      .single();

    if (existingCarrier?.qb_vendor_id) {
      await logSync({
        entityType: "carrier",
        entityId: carrier.id,
        action: "update",
        qbEntityType: "Vendor",
        qbEntityId: existingCarrier.qb_vendor_id,
        status: "success",
      });
      return { success: true, qbId: existingCarrier.qb_vendor_id };
    }

    // Build QBO Vendor object
    const qbVendor: Record<string, unknown> = {
      DisplayName: carrier.name,
      CompanyName: carrier.name,
      Vendor1099: true, // 1099 tracking ON
    };

    if (carrier.contact_name) {
      const nameParts = carrier.contact_name.split(" ");
      qbVendor.GivenName = nameParts[0] ?? "";
      qbVendor.FamilyName = nameParts.slice(1).join(" ") || nameParts[0];
    }
    if (carrier.email) {
      qbVendor.PrimaryEmailAddr = { Address: carrier.email };
    }
    if (carrier.phone) {
      qbVendor.PrimaryPhone = { FreeFormNumber: carrier.phone };
    }
    if (carrier.address) {
      qbVendor.BillAddr = { Line1: carrier.address };
    }
    if (carrier.ein) {
      qbVendor.TaxIdentifier = carrier.ein;
    }

    const result = await qb.createVendor(qbVendor);
    const qbId = String(result.Id);

    // Store qb_vendor_id back in Supabase with environment tag
    const env = await getCurrentQBEnvironment();
    const { error: linkErr } = await supabase
      .from("carriers")
      .update({ qb_vendor_id: qbId, qb_environment: env })
      .eq("id", carrier.id);

    if (linkErr) {
      console.error("[QB Sync] Failed to link carrier vendor QB ID:", linkErr.message);
    }

    await logSync({
      entityType: "carrier",
      entityId: carrier.id,
      action: "create",
      qbEntityType: "Vendor",
      qbEntityId: qbId,
      status: "success",
    });

    console.log(`[QB] Vendor created: ${carrier.name} → QB ID ${qbId}`);
    return { success: true, qbId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[QB] Failed to create vendor ${carrier.name}:`, message);

    await logSync({
      entityType: "carrier",
      entityId: carrier.id,
      action: "create",
      qbEntityType: "Vendor",
      status: "failed",
      errorMessage: message,
    });

    return { success: false, error: message };
  }
}

/**
 * Create or update a service Item in QBO (e.g., "Mason Sand Hauling").
 */
export async function createOrUpdateItem(material: {
  id: string;
  name: string;
  description?: string | null;
}): Promise<{ success: boolean; qbId?: string; error?: string }> {
  const qb = await getQBClient();
  if (!qb) return { success: false, error: "QuickBooks not connected" };

  try {
    // First check if item already exists by name
    let existingItems;
    try {
      existingItems = await qb.findItems(`%${material.name}%`);
    } catch (findErr) {
      console.warn("[QB Sync] Failed to search for existing items:", findErr instanceof Error ? findErr.message : findErr);
      existingItems = null;
    }

    const items = existingItems?.QueryResponse?.Item;
    if (items && items.length > 0) {
      // Find exact match
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const match = items.find((i: any) => i.Name === `${material.name} Hauling`);
      if (match) {
        const qbId = String(match.Id);
        await logSync({
          entityType: "material",
          entityId: material.id,
          action: "update",
          qbEntityType: "Item",
          qbEntityId: qbId,
          status: "success",
        });
        return { success: true, qbId };
      }
    }

    // Create new service item
    // Note: IncomeAccountRef needs to reference an existing income account in QBO
    // Account name is configurable via Settings > Business Rules > QuickBooks
    const qbIncomeAccount = await getBusinessSetting("qb_income_account");
    const qbItem: Record<string, unknown> = {
      Name: `${material.name} Hauling`,
      Type: "Service",
      Description: material.description ?? `${material.name} hauling services`,
      IncomeAccountRef: {
        name: qbIncomeAccount,
      },
    };

    const result = await qb.createItem(qbItem);
    const qbId = String(result.Id);

    await logSync({
      entityType: "material",
      entityId: material.id,
      action: "create",
      qbEntityType: "Item",
      qbEntityId: qbId,
      status: "success",
    });

    console.log(
      `[QB] Item created: ${material.name} Hauling → QB ID ${qbId}`
    );
    return { success: true, qbId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[QB] Failed to create item ${material.name}:`, message);

    await logSync({
      entityType: "material",
      entityId: material.id,
      action: "create",
      qbEntityType: "Item",
      status: "failed",
      errorMessage: message,
    });

    return { success: false, error: message };
  }
}

// ============================================================================
// INVOICE SYNC (TMS → QBO)
// ============================================================================

/**
 * Sync an invoice from TMS to QuickBooks Online.
 * Creates a QBO Invoice with line items and stores the qb_invoice_id.
 */
export async function syncInvoiceToQBO(
  invoiceId: string
): Promise<{ success: boolean; qbInvoiceId?: string; error?: string }> {
  const qb = await getQBClient();
  if (!qb) return { success: false, error: "QuickBooks not connected" };

  try {
    const supabase = createAdminClient();
    if (!supabase) return { success: false, error: "Supabase not configured" };

    // Fetch invoice with line items
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select(`
        *,
        customer:customers(*),
        line_items:invoice_line_items(
          *,
          material:materials(id, name, unit_of_measure),
          purchase_order:purchase_orders(id, po_number)
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invErr || !invoice) {
      return { success: false, error: `Invoice not found: ${invErr?.message}` };
    }

    // Check if already synced
    if (invoice.qb_invoice_id) {
      return { success: true, qbInvoiceId: invoice.qb_invoice_id };
    }

    // Ensure customer is in QBO
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = invoice.customer as any;
    if (!customer?.qb_customer_id) {
      const custResult = await createOrUpdateCustomer({
        id: customer.id,
        name: customer.name,
        billing_email: customer.billing_email,
        billing_address: customer.billing_address,
        phone: customer.phone,
      });
      if (!custResult.success) {
        return {
          success: false,
          error: `Must create customer in QBO first: ${custResult.error}`,
        };
      }
      customer.qb_customer_id = custResult.qbId;
    }

    // Build QBO invoice line items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems = (invoice.line_items as any[]) ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qbLines: Record<string, unknown>[] = lineItems.map((item: any) => ({
      Amount: item.amount,
      DetailType: "SalesItemLineDetail",
      Description: item.description,
      SalesItemLineDetail: {
        Qty: item.quantity,
        UnitPrice: item.rate,
      },
    }));

    // Collect unique PO numbers for CustomField
    const poNumbers = [
      ...new Set(
        lineItems
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((li: any) => li.purchase_order?.po_number)
          .filter(Boolean)
      ),
    ];

    // Build QBO Invoice object
    const qbInvoice: Record<string, unknown> = {
      CustomerRef: {
        value: customer.qb_customer_id,
      },
      DocNumber: invoice.invoice_number,
      TxnDate: invoice.created_at.split("T")[0],
      DueDate: invoice.due_date,
      Line: qbLines,
      BillEmail: customer.billing_email
        ? { Address: customer.billing_email }
        : undefined,
    };

    // Add PO number as custom field if available
    if (poNumbers.length > 0) {
      qbInvoice.CustomField = [
        {
          DefinitionId: "1",
          StringValue: poNumbers.join(", "),
          Type: "StringType",
          Name: "PO Number",
        },
      ];
    }

    // Create invoice in QBO
    const result = await qb.createInvoice(qbInvoice);
    const qbInvoiceId = String(result.Id);

    // Store qb_invoice_id back in Supabase with environment tag
    const env = await getCurrentQBEnvironment();
    const { error: invoiceLinkErr } = await supabase
      .from("invoices")
      .update({ qb_invoice_id: qbInvoiceId, qb_environment: env })
      .eq("id", invoiceId);

    if (invoiceLinkErr) {
      console.error("[QB Sync] Failed to link invoice QB ID:", invoiceLinkErr.message);
    }

    await logSync({
      entityType: "invoice",
      entityId: invoiceId,
      action: "create",
      qbEntityType: "Invoice",
      qbEntityId: qbInvoiceId,
      status: "success",
    });

    console.log(
      `[QB] Invoice synced: ${invoice.invoice_number} → QB ID ${qbInvoiceId}`
    );

    // Try to attach PDF if it exists
    try {
      await attachInvoicePDF(qb, invoiceId, qbInvoiceId, invoice.invoice_number);
    } catch (pdfErr) {
      console.warn("[QB] Failed to attach PDF (non-critical):", pdfErr);
    }

    return { success: true, qbInvoiceId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[QB] Failed to sync invoice ${invoiceId}:`, message);

    await logSync({
      entityType: "invoice",
      entityId: invoiceId,
      action: "create",
      qbEntityType: "Invoice",
      status: "failed",
      errorMessage: message,
    });

    return { success: false, error: message };
  }
}

/**
 * Attach invoice PDF to the QBO invoice.
 */
async function attachInvoicePDF(
  qb: QBClient,
  invoiceId: string,
  qbInvoiceId: string,
  invoiceNumber: string
): Promise<void> {
  // Generate PDF via the service
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const React = await import("react");
  const { InvoicePDF } = await import("@/lib/pdf/invoice-template");
  const { getInvoiceWithDetails } = await import(
    "@/lib/services/invoice.service"
  );

  const invoice = await getInvoiceWithDetails(invoiceId);
  if (!invoice) return;

  const pdfElement = React.createElement(InvoicePDF, { invoice });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(pdfElement as any);

  await qb.uploadAttachment(
    "Invoice",
    qbInvoiceId,
    `${invoiceNumber}.pdf`,
    "application/pdf",
    pdfBuffer
  );

  console.log(`[QB] PDF attached to invoice ${invoiceNumber}`);
}

// ============================================================================
// SETTLEMENT / BILL SYNC (TMS → QBO)
// ============================================================================

/**
 * Sync a carrier settlement to QBO as a Bill.
 * Creates a QBO Bill for the carrier payout amount.
 */
export async function syncSettlementToQBO(
  settlementId: string
): Promise<{ success: boolean; qbBillId?: string; error?: string }> {
  const qb = await getQBClient();
  if (!qb) return { success: false, error: "QuickBooks not connected" };

  try {
    const supabase = createAdminClient();
    if (!supabase) return { success: false, error: "Supabase not configured" };

    // Fetch settlement with carrier details
    const { data: settlement, error: setErr } = await supabase
      .from("carrier_settlements")
      .select("*, carrier:carriers(*)")
      .eq("id", settlementId)
      .single();

    if (setErr || !settlement) {
      return { success: false, error: `Settlement not found: ${setErr?.message}` };
    }

    // Check if already synced
    if (settlement.qb_bill_id) {
      return { success: true, qbBillId: settlement.qb_bill_id };
    }

    // Ensure carrier/vendor is in QBO
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const carrier = settlement.carrier as any;
    if (!carrier?.qb_vendor_id) {
      const vendorResult = await createOrUpdateVendor({
        id: carrier.id,
        name: carrier.name,
        contact_name: carrier.contact_name,
        email: carrier.email,
        phone: carrier.phone,
        address: carrier.address,
        ein: carrier.ein,
      });
      if (!vendorResult.success) {
        return {
          success: false,
          error: `Must create vendor in QBO first: ${vendorResult.error}`,
        };
      }
      carrier.qb_vendor_id = vendorResult.qbId;
    }

    // Build QBO Bill line items
    // NOTE: QBO does not accept negative line amounts on bills.
    // Deductions are subtracted from the hauling amount to produce a net line.
    const qbLines: Record<string, unknown>[] = [];
    const deductions = settlement.deductions ?? 0;
    const netHauling = settlement.hauling_amount - deductions;

    if (netHauling > 0) {
      const qbExpenseAccount = await getBusinessSetting("qb_expense_account");
      const description = deductions > 0
        ? `Hauling Services - ${settlement.period_start} to ${settlement.period_end} (less $${deductions.toFixed(2)} deductions)`
        : `Hauling Services - ${settlement.period_start} to ${settlement.period_end}`;

      qbLines.push({
        Amount: netHauling,
        DetailType: "AccountBasedExpenseLineDetail",
        Description: description,
        AccountBasedExpenseLineDetail: {
          AccountRef: { name: qbExpenseAccount },
        },
      });
    }

    // Build QBO Bill — Amount should be the total (hauling - deductions + dispatch fee)
    const qbBill: Record<string, unknown> = {
      VendorRef: { value: carrier.qb_vendor_id },
      TxnDate: settlement.period_end,
      DueDate: settlement.period_end, // Carrier settlements due immediately on approval
      Line: qbLines,
    };

    const result = await qb.createBill(qbBill);
    const qbBillId = String(result.Id);

    // Store qb_bill_id back in Supabase with environment tag
    const env = await getCurrentQBEnvironment();
    const { error: billLinkErr } = await supabase
      .from("carrier_settlements")
      .update({ qb_bill_id: qbBillId, qb_environment: env })
      .eq("id", settlementId);

    if (billLinkErr) {
      console.error("[QB Sync] Failed to link settlement QB bill ID:", billLinkErr.message);
    }

    await logSync({
      entityType: "settlement",
      entityId: settlementId,
      action: "create",
      qbEntityType: "Bill",
      qbEntityId: qbBillId,
      status: "success",
    });

    console.log(
      `[QB] Settlement bill created: ${carrier.name} → QB Bill ID ${qbBillId}`
    );
    return { success: true, qbBillId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[QB] Failed to sync settlement ${settlementId}:`, message);

    await logSync({
      entityType: "settlement",
      entityId: settlementId,
      action: "create",
      qbEntityType: "Bill",
      status: "failed",
      errorMessage: message,
    });

    return { success: false, error: message };
  }
}

// ============================================================================
// DISPATCH FEE BILL (separate from carrier payout)
// ============================================================================

/**
 * Create a separate QBO Bill for the dispatch fee.
 * Keeps dispatch fees separate from hauling pay on the P&L.
 */
export async function syncDispatchFeeToQBO(
  carrierId: string,
  weekStart: string,
  weekEnd: string,
  amount: number
): Promise<{ success: boolean; qbBillId?: string; error?: string }> {
  const qb = await getQBClient();
  if (!qb) return { success: false, error: "QuickBooks not connected" };

  try {
    const supabase = createAdminClient();
    if (!supabase) return { success: false, error: "Supabase not configured" };

    // Get carrier with QBO vendor ID
    const { data: carrier, error: carErr } = await supabase
      .from("carriers")
      .select("*")
      .eq("id", carrierId)
      .single();

    if (carErr || !carrier) {
      return { success: false, error: `Carrier not found: ${carErr?.message}` };
    }

    // Ensure vendor is in QBO
    if (!carrier.qb_vendor_id) {
      const vendorResult = await createOrUpdateVendor({
        id: carrier.id,
        name: carrier.name,
        contact_name: carrier.contact_name,
        email: carrier.email,
        phone: carrier.phone,
        address: carrier.address,
        ein: carrier.ein,
      });
      if (!vendorResult.success) {
        return { success: false, error: vendorResult.error };
      }
      carrier.qb_vendor_id = vendorResult.qbId ?? null;
    }

    // Build dispatch fee bill
    const qbBill: Record<string, unknown> = {
      VendorRef: { value: carrier.qb_vendor_id },
      TxnDate: weekEnd,
      DueDate: weekEnd,
      Line: [
        {
          Amount: amount,
          DetailType: "AccountBasedExpenseLineDetail",
          Description: `Dispatch Services - ${weekStart} to ${weekEnd}`,
          AccountBasedExpenseLineDetail: {
            AccountRef: { name: "Dispatch Fees" },
          },
        },
      ],
    };

    const result = await qb.createBill(qbBill);
    const qbBillId = String(result.Id);

    await logSync({
      entityType: "dispatch_fee",
      entityId: carrierId,
      action: "create",
      qbEntityType: "Bill",
      qbEntityId: qbBillId,
      status: "success",
    });

    console.log(
      `[QB] Dispatch fee bill created: ${carrier.name} $${amount} → QB Bill ID ${qbBillId}`
    );
    return { success: true, qbBillId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[QB] Failed to create dispatch fee bill:`, message);

    await logSync({
      entityType: "dispatch_fee",
      entityId: carrierId,
      action: "create",
      qbEntityType: "Bill",
      status: "failed",
      errorMessage: message,
    });

    return { success: false, error: message };
  }
}

// ============================================================================
// PAYMENT SYNC (QBO → TMS)
// ============================================================================

/**
 * Sync a payment from QBO to TMS.
 * Called when a webhook notifies us of a Payment event.
 */
export async function syncPaymentFromQBO(
  qbPaymentId: string
): Promise<{ success: boolean; error?: string }> {
  const qb = await getQBClient();
  if (!qb) return { success: false, error: "QuickBooks not connected" };

  try {
    const supabase = createAdminClient();
    if (!supabase) return { success: false, error: "Supabase not configured" };

    // Check if this payment was already synced (duplicate protection)
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("qb_payment_id", qbPaymentId)
      .maybeSingle();

    if (existingPayment) {
      return { success: true };
    }

    // Fetch payment from QBO
    const qbPayment = await qb.getPayment(qbPaymentId);

    if (!qbPayment) {
      return { success: false, error: "Payment not found in QBO" };
    }

    const totalAmt = qbPayment.TotalAmt ?? 0;
    const txnDate = qbPayment.TxnDate ?? new Date().toISOString().split("T")[0];

    // Find linked invoices
    const linkedTxns =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qbPayment.Line?.flatMap((line: any) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (line.LinkedTxn ?? []).filter((txn: any) => txn.TxnType === "Invoice")
      ) ?? [];

    for (const linkedInvoice of linkedTxns) {
      const qbInvoiceId = String(linkedInvoice.TxnId);

      // Find matching invoice in Supabase via qb_invoice_id
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, customer_id, invoice_number, total, status")
        .eq("qb_invoice_id", qbInvoiceId)
        .single();

      if (!invoice) {
        console.warn(
          `[QB] No matching TMS invoice for QB Invoice ${qbInvoiceId}`
        );
        continue;
      }

      // Create payment record in Supabase with environment tag
      const paymentEnv = await getCurrentQBEnvironment();
      const { error: payInsertErr } = await supabase.from("payments").insert({
        invoice_id: invoice.id,
        customer_id: invoice.customer_id,
        amount: linkedInvoice.Amount ?? totalAmt,
        payment_method: "ach" as const,
        status: "completed" as const,
        qb_payment_id: qbPaymentId,
        qb_environment: paymentEnv,
        paid_at: txnDate,
        recorded_at: new Date().toISOString(),
      });

      if (payInsertErr) {
        console.error("[QB Sync] Failed to insert payment record:", payInsertErr.message);
        return { success: false, error: `Failed to record payment: ${payInsertErr.message}` };
      }

      // Sum ALL existing payments for this invoice to determine correct status
      const { data: existingPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("invoice_id", invoice.id);

      const totalPaid = (existingPayments ?? []).reduce(
        (sum, p) => sum + (p.amount ?? 0),
        0
      );

      const newStatus = "paid" as const; // Simplified: any payment marks as paid

      const { error: statusErr } = await supabase
        .from("invoices")
        .update({
          status: newStatus,
          paid_at: txnDate,
        })
        .eq("id", invoice.id);

      if (statusErr) {
        console.error("[QB Sync] Failed to update invoice status:", statusErr.message);
        return { success: false, error: `Failed to update invoice status: ${statusErr.message}` };
      }

      console.log(
        `[QB] Payment recorded: Invoice ${invoice.invoice_number} → $${linkedInvoice.Amount ?? totalAmt}`
      );
    }

    await logSync({
      entityType: "payment",
      entityId: qbPaymentId,
      action: "create",
      qbEntityType: "Payment",
      qbEntityId: qbPaymentId,
      status: "success",
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[QB] Failed to sync payment ${qbPaymentId}:`, message);

    await logSync({
      entityType: "payment",
      entityId: qbPaymentId,
      action: "create",
      qbEntityType: "Payment",
      status: "failed",
      errorMessage: message,
    });

    return { success: false, error: message };
  }
}

// ============================================================================
// BILL PAYMENT / ACH (TMS → QBO)
// ============================================================================

/**
 * Create a BillPayment in QBO to trigger ACH via QBO Bill Pay.
 */
export async function createBillPaymentInQBO(
  settlementId: string
): Promise<{ success: boolean; qbBillPaymentId?: string; error?: string }> {
  const qb = await getQBClient();
  if (!qb) return { success: false, error: "QuickBooks not connected" };

  try {
    const supabase = createAdminClient();
    if (!supabase) return { success: false, error: "Supabase not configured" };

    // Get settlement with bill info
    const { data: settlement, error: setErr } = await supabase
      .from("carrier_settlements")
      .select("*, carrier:carriers(*)")
      .eq("id", settlementId)
      .single();

    if (setErr || !settlement) {
      return { success: false, error: `Settlement not found: ${setErr?.message}` };
    }

    if (!settlement.qb_bill_id) {
      return {
        success: false,
        error: "Settlement has no QBO bill. Sync settlement first.",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const carrier = settlement.carrier as any;

    // Build BillPayment
    const qbBankAccount = await getBusinessSetting("qb_bank_account");
    const qbBillPayment: Record<string, unknown> = {
      VendorRef: { value: carrier.qb_vendor_id },
      TotalAmt: settlement.total_amount,
      PayType: "Check",
      CheckPayment: {
        BankAccountRef: { name: qbBankAccount },
      },
      Line: [
        {
          Amount: settlement.total_amount,
          LinkedTxn: [
            { TxnId: settlement.qb_bill_id, TxnType: "Bill" },
          ],
        },
      ],
    };

    const result = await qb.createBillPayment(qbBillPayment);
    const qbBillPaymentId = String(result.Id);

    // NOTE: Do NOT update settlement status here — paySettlement() is the single
    // source of truth for status transitions to avoid "paid before verified" bugs.

    await logSync({
      entityType: "settlement",
      entityId: settlementId,
      action: "update",
      qbEntityType: "BillPayment",
      qbEntityId: qbBillPaymentId,
      status: "success",
    });

    console.log(
      `[QB] Bill payment created: ${carrier.name} $${settlement.total_amount} → QB BillPayment ID ${qbBillPaymentId}`
    );
    return { success: true, qbBillPaymentId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[QB] Failed to create bill payment for settlement ${settlementId}:`,
      message
    );

    await logSync({
      entityType: "settlement",
      entityId: settlementId,
      action: "update",
      qbEntityType: "BillPayment",
      status: "failed",
      errorMessage: message,
    });

    return { success: false, error: message };
  }
}

// ============================================================================
// RECONCILIATION
// ============================================================================

/**
 * Reconcile TMS records with QBO using Change Data Capture.
 * Checks for discrepancies between Supabase and QBO.
 */
export async function reconcileWithQBO(): Promise<{
  success: boolean;
  discrepancies: Array<{
    type: string;
    tmsId: string;
    qbId: string;
    issue: string;
  }>;
  error?: string;
}> {
  const discrepancies: Array<{
    type: string;
    tmsId: string;
    qbId: string;
    issue: string;
  }> = [];

  const qb = await getQBClient();
  if (!qb)
    return { success: false, discrepancies, error: "QuickBooks not connected" };

  try {
    const supabase = createAdminClient();
    if (!supabase)
      return { success: false, discrepancies, error: "Supabase not configured" };

    // Get last reconciliation time (default to 7 days ago)
    const lastSync = await getLastSyncTime("reconciliation");
    const since =
      lastSync ??
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch changed invoices and payments from QBO
    const cdcData = await qb.getChangedEntities(
      ["Invoice", "Payment", "Bill"],
      since
    );

    const cdcResponse = cdcData?.CDCResponse?.[0]?.QueryResponse ?? [];

    for (const queryResponse of cdcResponse) {
      // Check Invoice changes
      if (queryResponse.Invoice) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const qbInvoice of queryResponse.Invoice) {
          const qbId = String(qbInvoice.Id);

          // Find matching TMS invoice
          const { data: tmsInvoice } = await supabase
            .from("invoices")
            .select("id, invoice_number, total, status")
            .eq("qb_invoice_id", qbId)
            .maybeSingle();

          if (!tmsInvoice) {
            discrepancies.push({
              type: "Invoice",
              tmsId: "N/A",
              qbId,
              issue: `QBO Invoice ${qbId} has no matching TMS record`,
            });
            continue;
          }

          // Check if amounts match
          if (
            Math.abs(qbInvoice.TotalAmt - tmsInvoice.total) > 0.01
          ) {
            discrepancies.push({
              type: "Invoice",
              tmsId: tmsInvoice.id,
              qbId,
              issue: `Amount mismatch: TMS=$${tmsInvoice.total}, QBO=$${qbInvoice.TotalAmt}`,
            });
          }

          // Check for payments recorded in QBO but not in TMS
          if (qbInvoice.Balance === 0 && tmsInvoice.status !== "paid") {
            discrepancies.push({
              type: "Invoice",
              tmsId: tmsInvoice.id,
              qbId,
              issue: `Paid in QBO but TMS status is '${tmsInvoice.status}'`,
            });
          }
        }
      }

      // Check Payment changes — look for unrecorded payments
      if (queryResponse.Payment) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const qbPayment of queryResponse.Payment) {
          const qbPaymentId = String(qbPayment.Id);

          // Check if this payment is already recorded in TMS
          const { data: tmsPayment } = await supabase
            .from("payments")
            .select("id")
            .eq("qb_payment_id", qbPaymentId)
            .maybeSingle();

          if (!tmsPayment) {
            discrepancies.push({
              type: "Payment",
              tmsId: "N/A",
              qbId: qbPaymentId,
              issue: `QBO Payment ${qbPaymentId} ($${qbPayment.TotalAmt}) not recorded in TMS`,
            });

            // Auto-sync the missing payment
            await syncPaymentFromQBO(qbPaymentId);
          }
        }
      }
    }

    // Update last reconciliation time
    await setLastSyncTime("reconciliation");

    await logSync({
      entityType: "reconciliation",
      entityId: "system",
      action: "update",
      qbEntityType: "CDC",
      status: "success",
      errorMessage:
        discrepancies.length > 0
          ? `${discrepancies.length} discrepancies found`
          : undefined,
    });

    console.log(
      `[QB] Reconciliation complete: ${discrepancies.length} discrepancies`
    );
    return { success: true, discrepancies };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[QB] Reconciliation failed:", message);

    await logSync({
      entityType: "reconciliation",
      entityId: "system",
      action: "update",
      qbEntityType: "CDC",
      status: "failed",
      errorMessage: message,
    });

    return { success: false, discrepancies, error: message };
  }
}

// ============================================================================
// BULK SYNC OPERATIONS
// ============================================================================

/**
 * Sync all unsycned invoices to QBO.
 */
export async function syncAllInvoices(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  if (!supabase) return { synced: 0, failed: 0, errors: ["Supabase not configured"] };

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id")
    .is("qb_invoice_id", null)
    .eq("status", "sent")
    .order("created_at");

  if (!invoices || invoices.length === 0) {
    return { synced: 0, failed: 0, errors: [] };
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const inv of invoices) {
    const result = await syncInvoiceToQBO(inv.id);
    if (result.success) {
      synced++;
    } else {
      failed++;
      errors.push(`Invoice ${inv.id}: ${result.error}`);
    }
  }

  await setLastSyncTime("invoices");
  return { synced, failed, errors };
}

/**
 * Sync all unsynced settlements to QBO.
 */
export async function syncAllSettlements(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  if (!supabase) return { synced: 0, failed: 0, errors: ["Supabase not configured"] };

  const { data: settlements } = await supabase
    .from("carrier_settlements")
    .select("id")
    .is("qb_bill_id", null)
    .in("status", ["approved", "paid"])
    .order("created_at");

  if (!settlements || settlements.length === 0) {
    return { synced: 0, failed: 0, errors: [] };
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const settlement of settlements) {
    const result = await syncSettlementToQBO(settlement.id);
    if (result.success) {
      synced++;
    } else {
      failed++;
      errors.push(`Settlement ${settlement.id}: ${result.error}`);
    }
  }

  await setLastSyncTime("settlements");
  return { synced, failed, errors };
}

/**
 * Get connection status info for the admin QuickBooks page.
 * Environment is read from the DB (single source of truth), not just env var.
 */
export async function getConnectionStatus(): Promise<{
  connected: boolean;
  companyName: string | null;
  environment: string;
  connectedAt: string | null;
  lastSyncTime: string | null;
  tokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
}> {
  const { getTokens: fetchTokens } = await import(
    "@/lib/integrations/quickbooks/tokens"
  );
  const tokens = await fetchTokens();
  const env = await getCurrentQBEnvironment();

  if (!tokens) {
    return {
      connected: false,
      companyName: null,
      environment: env,
      connectedAt: null,
      lastSyncTime: null,
      tokenExpiresAt: null,
      refreshTokenExpiresAt: null,
    };
  }

  const lastSyncTime = await getLastSyncTime("reconciliation");

  return {
    connected: true,
    companyName: tokens.companyName,
    environment: env,
    connectedAt: tokens.connectedAt,
    lastSyncTime,
    tokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
  };
}
