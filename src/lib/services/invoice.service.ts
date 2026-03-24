import { createClient } from "@/lib/supabase/server";
import * as invoicesData from "@/lib/data/invoices.data";
import { calculateAmount } from "@/lib/utils/rate-calc";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Invoice,
  InvoiceWithLineItems,
  InvoiceWithDetails,
  InvoiceLineItemInsert,
  Customer,
  RateType,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoiceLineItemPreview {
  purchase_order_id: string;
  po_number: string;
  material_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  delivery_count: number;
  cost_code: string | null;
  delivery_address: string | null;
  delivery_date: string | null;
}

export interface InvoicePreview {
  customer: Customer;
  period_start: string;
  period_end: string;
  line_items: InvoiceLineItemPreview[];
  subtotal: number;
  tax_amount: number;
  total: number;
  delivery_count: number;
  po_count: number;
  warnings: string[];
}

// InvoiceWithDetails is exported from @/types/database

// Re-export company info and shared types for convenience
export { JFT_COMPANY } from "@/lib/constants/company";

// ---------------------------------------------------------------------------
// Preview — shows admin what the invoice will contain before generating
// ---------------------------------------------------------------------------

export async function previewInvoice(
  customerId: string,
  periodStart: string,
  periodEnd: string,
  purchaseOrderIds?: string[],
  supabaseClient?: SupabaseClient
): Promise<InvoicePreview> {
  const supabase = supabaseClient ?? await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  // 1. Get the customer
  const { data: customer, error: custErr } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (custErr || !customer) throw new Error("Customer not found");

  // 2. Find all confirmed deliveries for this customer in the date range
  //    Link: deliveries -> dispatches -> purchase_orders (where customer_id matches)
  let deliveryQuery = supabase
    .from("deliveries")
    .select(`
      id,
      net_weight,
      delivered_at,
      delivery_address,
      delivery_site_id,
      dispatch:dispatches!inner(
        id,
        purchase_order_id,
        material_id,
        delivery_site_id,
        purchase_order:purchase_orders!inner(
          id,
          customer_id,
          po_number,
          material_id,
          cost_code
        ),
        material:materials!inner(
          id,
          name,
          unit_of_measure
        )
      )
    `)
    .eq("confirmation_status", "confirmed")
    .gte("delivered_at", periodStart)
    .lte("delivered_at", `${periodEnd}T23:59:59.999Z`)
    .eq("dispatch.purchase_order.customer_id", customerId);

  if (purchaseOrderIds && purchaseOrderIds.length > 0) {
    deliveryQuery = deliveryQuery.in(
      "dispatch.purchase_order_id",
      purchaseOrderIds
    );
  }

  const { data: deliveries, error: delErr } = await deliveryQuery;

  if (delErr) throw new Error(`Failed to fetch deliveries: ${delErr.message}`);
  if (!deliveries || deliveries.length === 0) {
    return {
      customer: customer as Customer,
      period_start: periodStart,
      period_end: periodEnd,
      line_items: [],
      subtotal: 0,
      tax_amount: 0,
      total: 0,
      delivery_count: 0,
      po_count: 0,
      warnings: [],
    };
  }

  // 3. Group deliveries by PO + material (+ delivery_address for per-address invoicing)
  const groups = new Map<
    string,
    {
      purchase_order_id: string;
      po_number: string;
      material_id: string;
      material_name: string;
      unit: string;
      total_weight: number;
      delivery_count: number;
      cost_code: string | null;
      delivery_address: string | null;
      delivery_site_id: string | null;
      earliest_date: string;
      latest_date: string;
    }
  >();

  for (const del of deliveries) {
    const dispatch = del.dispatch as unknown as {
      id: string;
      purchase_order_id: string;
      material_id: string;
      delivery_site_id: string;
      purchase_order: { id: string; customer_id: string; po_number: string; material_id: string; cost_code: string | null };
      material: { id: string; name: string; unit_of_measure: string };
    };

    const po = dispatch.purchase_order;
    const material = dispatch.material;
    const addr = (del as { delivery_address?: string | null }).delivery_address ?? null;
    const delivDate = del.delivered_at as string;
    // Group by PO + material + delivery_address (null-safe)
    const groupKey = `${po.id}::${material.id}::${addr ?? ""}`;

    const existing = groups.get(groupKey);
    const weight = del.net_weight ?? 0;

    if (existing) {
      existing.total_weight += weight;
      existing.delivery_count += 1;
      if (delivDate < existing.earliest_date) existing.earliest_date = delivDate;
      if (delivDate > existing.latest_date) existing.latest_date = delivDate;
    } else {
      groups.set(groupKey, {
        purchase_order_id: po.id,
        po_number: po.po_number,
        material_id: material.id,
        material_name: material.name,
        unit: material.unit_of_measure,
        total_weight: weight,
        delivery_count: 1,
        cost_code: po.cost_code ?? null,
        delivery_address: addr,
        delivery_site_id: dispatch.delivery_site_id ?? null,
        earliest_date: delivDate,
        latest_date: delivDate,
      });
    }
  }

  // 4. Look up rates for each customer/material combination
  //    Rates are 3-dimensional: Customer x Material x City
  //    Try city-specific rate first (via delivery_site), fall back to no-city rate
  const lineItems: InvoiceLineItemPreview[] = [];
  const poIds = new Set<string>();
  const warnings: string[] = [];

  // Pre-fetch delivery site cities for city-based rate lookup
  const siteIds = [...new Set([...groups.values()].map((g) => g.delivery_site_id).filter(Boolean))] as string[];
  const siteMap = new Map<string, string | null>();
  if (siteIds.length > 0) {
    const { data: sites } = await supabase
      .from("sites")
      .select("id, city")
      .in("id", siteIds);
    for (const site of sites ?? []) {
      siteMap.set(site.id, site.city);
    }
  }

  for (const group of groups.values()) {
    poIds.add(group.purchase_order_id);

    const today = new Date().toISOString().split("T")[0];
    const deliveryCity = group.delivery_site_id ? siteMap.get(group.delivery_site_id) ?? null : null;

    // Try city-specific rate first
    let rateRow: { rate_per_unit: number; rate_type: RateType } | null = null;

    if (deliveryCity) {
      const { data: cityRates } = await supabase
        .from("rates")
        .select("rate_per_unit, rate_type")
        .eq("type", "customer")
        .eq("customer_id", customerId)
        .eq("material_id", group.material_id)
        .eq("delivery_city", deliveryCity)
        .lte("effective_date", today)
        .or(`expiration_date.is.null,expiration_date.gte.${today}`)
        .order("effective_date", { ascending: false })
        .limit(1);

      if (cityRates && cityRates.length > 0) {
        rateRow = cityRates[0] as { rate_per_unit: number; rate_type: RateType };
      }
    }

    // Fall back to no-city rate
    if (!rateRow) {
      const { data: fallbackRates } = await supabase
        .from("rates")
        .select("rate_per_unit, rate_type")
        .eq("type", "customer")
        .eq("customer_id", customerId)
        .eq("material_id", group.material_id)
        .is("delivery_city", null)
        .lte("effective_date", today)
        .or(`expiration_date.is.null,expiration_date.gte.${today}`)
        .order("effective_date", { ascending: false })
        .limit(1);

      if (fallbackRates && fallbackRates.length > 0) {
        rateRow = fallbackRates[0] as { rate_per_unit: number; rate_type: RateType };
      }
    }

    const ratePerUnit = rateRow?.rate_per_unit ?? 0;
    const rateType: RateType = rateRow?.rate_type ?? "per_ton";

    if (ratePerUnit === 0) {
      warnings.push(
        `No rate configured for ${group.material_name} for ${customer.name} (PO #${group.po_number}). Line item will be $0.`
      );
    }

    // THE FIX: use calculateAmount() which respects rate_type (per_load vs per_ton)
    const calc = calculateAmount({
      rateType,
      ratePerUnit,
      netWeight: group.total_weight,
      deliveryCount: group.delivery_count,
    });

    if (calc.missingWeight) {
      warnings.push(
        `Missing weight data for ${group.material_name} (PO #${group.po_number}): ${group.delivery_count} delivery(ies) with per-ton rate but no weight recorded.`
      );
    }

    lineItems.push({
      purchase_order_id: group.purchase_order_id,
      po_number: group.po_number,
      material_id: group.material_id,
      material_name: group.material_name,
      quantity: calc.quantity,
      unit: calc.unit,
      rate: ratePerUnit,
      amount: calc.amount,
      delivery_count: group.delivery_count,
      cost_code: group.cost_code,
      delivery_address: group.delivery_address,
      delivery_date: group.earliest_date?.split("T")[0] ?? null,
    });
  }

  const subtotal = parseFloat(
    lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
  );

  return {
    customer: customer as Customer,
    period_start: periodStart,
    period_end: periodEnd,
    line_items: lineItems,
    subtotal,
    tax_amount: 0, // Hauling services not taxable in Texas
    total: subtotal,
    delivery_count: deliveries.length,
    po_count: poIds.size,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Generate — creates the invoice and line items in the database
// ---------------------------------------------------------------------------

export async function generateInvoice(
  customerId: string,
  periodStart: string,
  periodEnd: string,
  purchaseOrderIds?: string[],
  supabaseClient?: SupabaseClient
): Promise<InvoiceWithLineItems> {
  const supabase = supabaseClient ?? await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  // 1. Preview to get the line items
  const preview = await previewInvoice(
    customerId,
    periodStart,
    periodEnd,
    purchaseOrderIds,
    supabaseClient
  );

  if (preview.line_items.length === 0) {
    throw new Error("No confirmed deliveries found for the selected period");
  }

  // Reject generation if any line item has a $0 rate
  const zeroRateItems = preview.line_items.filter((item) => item.rate === 0);
  if (zeroRateItems.length > 0) {
    const details = zeroRateItems
      .map((item) => `${item.material_name} (PO #${item.po_number})`)
      .join(", ");
    throw new Error(
      `Cannot generate invoice: No rate configured for ${details} for ${preview.customer.name}. Please set up rates first.`
    );
  }

  // 2. Generate invoice number
  const invoiceNumber = await invoicesData.getNextInvoiceNumber();

  // 3. Calculate due date based on customer payment terms (with settings fallback)
  const paymentTermsDays: Record<string, number> = {
    net_15: 15,
    net_30: 30,
    net_45: 45,
    net_60: 60,
  };
  let daysUntilDue = paymentTermsDays[preview.customer.payment_terms] ?? 30;
  try {
    const { getBusinessSettingNumber } = await import("@/lib/utils/settings");
    const configuredDueDays = await getBusinessSettingNumber("invoice_due_days");
    // Only use configured value as fallback if customer has no specific terms
    if (!paymentTermsDays[preview.customer.payment_terms]) {
      daysUntilDue = configuredDueDays;
    }
  } catch {
    // Settings not available — use customer terms
  }
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + daysUntilDue);
  const dueDateStr = dueDate.toISOString().split("T")[0];

  // 4. Create the invoice record
  const invoice = await invoicesData.create({
    customer_id: customerId,
    invoice_number: invoiceNumber,
    period_start: periodStart,
    period_end: periodEnd,
    subtotal: preview.subtotal,
    tax_amount: 0,
    total: preview.total,
    status: "draft",
    due_date: dueDateStr,
    sent_at: null,
    paid_at: null,
    qb_invoice_id: null,
    qb_payment_link: null,
    pdf_url: null,
    notes: null,
    created_by: null,
  });

  // 5. Create line items (with cost_code, delivery_date, delivery_address from preview)
  const lineItemInserts: InvoiceLineItemInsert[] = preview.line_items.map(
    (item) => ({
      invoice_id: invoice.id,
      purchase_order_id: item.purchase_order_id,
      material_id: item.material_id,
      description: `Hauling Services \u2014 ${item.material_name} (${item.delivery_count} ${item.unit})`,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      amount: item.amount,
      delivery_id: null,
      cost_code: item.cost_code ?? undefined,
      delivery_date: item.delivery_date ?? undefined,
      delivery_address: item.delivery_address ?? undefined,
    })
  );

  const lineItems = await invoicesData.addLineItems(lineItemInserts);

  // 6. Update the invoice subtotal/total (in case DB trigger didn't fire)
  await invoicesData.update(invoice.id, {
    subtotal: preview.subtotal,
    total: preview.total,
  });

  return {
    ...invoice,
    customer: preview.customer,
    line_items: lineItems,
  };
}

// ---------------------------------------------------------------------------
// Get full invoice with details — for PDF rendering and detail pages
// ---------------------------------------------------------------------------

export async function getInvoiceWithDetails(
  invoiceId: string,
  supabaseClient?: SupabaseClient
): Promise<InvoiceWithDetails | null> {
  const supabase = supabaseClient ?? await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
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

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch invoice: ${error.message}`);
  }

  return data as unknown as InvoiceWithDetails;
}
