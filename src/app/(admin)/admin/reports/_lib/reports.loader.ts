import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RevenueByCustomer {
  customerId: string;
  customerName: string;
  revenue: number;
  loads: number;
}

export interface RevenueByMaterial {
  materialId: string;
  materialName: string;
  revenue: number;
  loads: number;
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
  loads: number;
}

export interface ArAgingRow {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  total: number;
  dueDate: string;
  daysOverdue: number;
  bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
  status: string;
}

export interface CarrierPayRow {
  carrierId: string;
  carrierName: string;
  haulingAmount: number;
  dispatchFee: number;
  deductions: number;
  totalPaid: number;
  settlements: number;
}

export interface LoadVolumeDay {
  date: string;
  loads: number;
}

export interface POStatusRow {
  id: string;
  poNumber: string;
  customerName: string;
  materialName: string;
  quantityOrdered: number;
  quantityDelivered: number;
  percentComplete: number;
  status: string;
}

export interface MarginRow {
  period: string;
  revenue: number;
  carrierPay: number;
  dispatchFees: number;
  grossMargin: number;
  marginPercent: number;
}

export interface RevenueReportData {
  byCustomer: RevenueByCustomer[];
  byMaterial: RevenueByMaterial[];
  byMonth: RevenueByMonth[];
  totalRevenue: number;
  totalLoads: number;
  avgPerLoad: number;
}

export interface ReportsData {
  revenue: RevenueReportData;
  arAging: ArAgingRow[];
  carrierPay: CarrierPayRow[];
  loadVolume: LoadVolumeDay[];
  poStatus: POStatusRow[];
  margin: MarginRow[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loadReportsData(
  from?: string,
  to?: string
): Promise<ReportsData> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      revenue: { byCustomer: [], byMaterial: [], byMonth: [], totalRevenue: 0, totalLoads: 0, avgPerLoad: 0 },
      arAging: [],
      carrierPay: [],
      loadVolume: [],
      poStatus: [],
      margin: [],
    };
  }

  const dateFrom = from || startOfYear();
  const dateTo = to || new Date().toISOString().split("T")[0];

  try {
    const [
      invoicesResult,
      lineItemsResult,
      outstandingResult,
      settlementsResult,
      deliveriesResult,
      posResult,
    ] = await Promise.all([
      // 1. All invoices in range for revenue
      supabase
        .from("invoices")
        .select("*, customer:customers(id, name)")
        .gte("created_at", dateFrom)
        .lte("created_at", `${dateTo}T23:59:59`)
        .in("status", ["sent", "paid"])
        .order("created_at", { ascending: true }),

      // 2. Line items with material info for material breakdown
      supabase
        .from("invoice_line_items")
        .select("*, invoice:invoices!inner(created_at, status), material:materials(id, name)")
        .gte("invoice.created_at", dateFrom)
        .lte("invoice.created_at", `${dateTo}T23:59:59`)
        .in("invoice.status", ["sent", "paid"]),

      // 3. Outstanding invoices for AR aging (sent invoices, overdue computed client-side)
      supabase
        .from("invoices")
        .select("*, customer:customers(id, name)")
        .eq("status", "sent")
        .order("due_date", { ascending: true }),

      // 4. Carrier settlements for carrier pay & margin
      supabase
        .from("carrier_settlements")
        .select("*, carrier:carriers(id, name)")
        .gte("period_start", dateFrom)
        .lte("period_end", dateTo)
        .in("status", ["draft", "approved", "paid"])
        .order("period_end", { ascending: true }),

      // 5. Deliveries for load volume
      supabase
        .from("deliveries")
        .select("id, delivered_at, net_weight")
        .gte("delivered_at", `${dateFrom}T00:00:00`)
        .lte("delivered_at", `${dateTo}T23:59:59`)
        .order("delivered_at", { ascending: true }),

      // 6. Purchase orders for PO status
      supabase
        .from("purchase_orders")
        .select("*, customer:customers(name), material:materials(name)")
        .eq("status", "active")
        .order("created_at", { ascending: false }),
    ]);

    // ------- Process Revenue -------
    const invoices = (invoicesResult.data ?? []) as Array<{
      id: string;
      total: number;
      created_at: string;
      customer: { id: string; name: string } | null;
    }>;

    const customerMap = new Map<string, RevenueByCustomer>();
    const monthMap = new Map<string, RevenueByMonth>();
    let totalRevenue = 0;

    for (const inv of invoices) {
      totalRevenue += inv.total;
      const custId = inv.customer?.id ?? "unknown";
      const custName = inv.customer?.name ?? "Unknown";
      const existing = customerMap.get(custId);
      if (existing) {
        existing.revenue += inv.total;
        existing.loads += 1;
      } else {
        customerMap.set(custId, { customerId: custId, customerName: custName, revenue: inv.total, loads: 1 });
      }

      const month = inv.created_at.slice(0, 7); // YYYY-MM
      const existingMonth = monthMap.get(month);
      if (existingMonth) {
        existingMonth.revenue += inv.total;
        existingMonth.loads += 1;
      } else {
        monthMap.set(month, { month, revenue: inv.total, loads: 1 });
      }
    }

    // Material breakdown from line items
    const lineItems = (lineItemsResult.data ?? []) as Array<{
      amount: number;
      material: { id: string; name: string } | null;
    }>;
    const materialMap = new Map<string, RevenueByMaterial>();
    for (const li of lineItems) {
      const matId = li.material?.id ?? "unknown";
      const matName = li.material?.name ?? "Other";
      const existing = materialMap.get(matId);
      if (existing) {
        existing.revenue += li.amount;
        existing.loads += 1;
      } else {
        materialMap.set(matId, { materialId: matId, materialName: matName, revenue: li.amount, loads: 1 });
      }
    }

    const totalLoads = invoices.length;
    const avgPerLoad = totalLoads > 0 ? totalRevenue / totalLoads : 0;

    // ------- AR Aging -------
    const outstanding = (outstandingResult.data ?? []) as Array<{
      id: string;
      invoice_number: string;
      total: number;
      due_date: string;
      status: string;
      customer: { id: string; name: string } | null;
    }>;

    const arAging: ArAgingRow[] = outstanding.map((inv) => {
      const dueDate = new Date(inv.due_date);
      const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      let bucket: ArAgingRow["bucket"] = "current";
      if (daysOverdue > 90) bucket = "90+";
      else if (daysOverdue > 60) bucket = "61-90";
      else if (daysOverdue > 30) bucket = "31-60";
      else if (daysOverdue > 0) bucket = "1-30";

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        customerId: inv.customer?.id ?? "",
        customerName: inv.customer?.name ?? "Unknown",
        total: inv.total,
        dueDate: inv.due_date,
        daysOverdue: Math.max(0, daysOverdue),
        bucket,
        status: inv.status,
      };
    });

    // ------- Carrier Pay -------
    const settlements = (settlementsResult.data ?? []) as Array<{
      carrier: { id: string; name: string } | null;
      hauling_amount: number;
      dispatch_fee: number;
      deductions: number;
      total_amount: number;
      period_start: string;
      period_end: string;
    }>;

    const carrierPayMap = new Map<string, CarrierPayRow>();
    for (const s of settlements) {
      const cId = s.carrier?.id ?? "unknown";
      const cName = s.carrier?.name ?? "Unknown";
      const existing = carrierPayMap.get(cId);
      if (existing) {
        existing.haulingAmount += s.hauling_amount;
        existing.dispatchFee += s.dispatch_fee;
        existing.deductions += s.deductions;
        existing.totalPaid += s.total_amount;
        existing.settlements += 1;
      } else {
        carrierPayMap.set(cId, {
          carrierId: cId,
          carrierName: cName,
          haulingAmount: s.hauling_amount,
          dispatchFee: s.dispatch_fee,
          deductions: s.deductions,
          totalPaid: s.total_amount,
          settlements: 1,
        });
      }
    }

    // ------- Load Volume -------
    const deliveries = (deliveriesResult.data ?? []) as Array<{
      id: string;
      delivered_at: string;
      net_weight: number | null;
    }>;

    const volumeMap = new Map<string, number>();
    for (const d of deliveries) {
      const day = d.delivered_at.split("T")[0];
      volumeMap.set(day, (volumeMap.get(day) ?? 0) + 1);
    }
    const loadVolume: LoadVolumeDay[] = Array.from(volumeMap.entries())
      .map(([date, loads]) => ({ date, loads }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ------- PO Status -------
    const pos = (posResult.data ?? []) as Array<{
      id: string;
      po_number: string;
      quantity_ordered: number;
      quantity_delivered: number;
      status: string;
      customer: { name: string } | null;
      material: { name: string } | null;
    }>;

    const poStatus: POStatusRow[] = pos.map((po) => ({
      id: po.id,
      poNumber: po.po_number,
      customerName: po.customer?.name ?? "Unknown",
      materialName: po.material?.name ?? "Unknown",
      quantityOrdered: po.quantity_ordered,
      quantityDelivered: po.quantity_delivered,
      percentComplete: po.quantity_ordered > 0 ? Math.round((po.quantity_delivered / po.quantity_ordered) * 100) : 0,
      status: po.status,
    }));

    // ------- Margin by Month -------
    // Group revenue by month, subtract carrier costs
    const marginMonthMap = new Map<string, { revenue: number; carrierPay: number; dispatchFees: number }>();

    for (const inv of invoices) {
      const month = inv.created_at.slice(0, 7);
      const existing = marginMonthMap.get(month) ?? { revenue: 0, carrierPay: 0, dispatchFees: 0 };
      existing.revenue += inv.total;
      marginMonthMap.set(month, existing);
    }

    for (const s of settlements) {
      const month = s.period_end.slice(0, 7);
      const existing = marginMonthMap.get(month) ?? { revenue: 0, carrierPay: 0, dispatchFees: 0 };
      existing.carrierPay += s.hauling_amount;
      existing.dispatchFees += s.dispatch_fee;
      marginMonthMap.set(month, existing);
    }

    const margin: MarginRow[] = Array.from(marginMonthMap.entries())
      .map(([period, data]) => {
        const grossMargin = data.revenue - data.carrierPay - data.dispatchFees;
        return {
          period,
          revenue: data.revenue,
          carrierPay: data.carrierPay,
          dispatchFees: data.dispatchFees,
          grossMargin,
          marginPercent: data.revenue > 0 ? Math.round((grossMargin / data.revenue) * 100) : 0,
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));

    return {
      revenue: {
        byCustomer: Array.from(customerMap.values()).sort((a, b) => b.revenue - a.revenue),
        byMaterial: Array.from(materialMap.values()).sort((a, b) => b.revenue - a.revenue),
        byMonth: Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
        totalRevenue,
        totalLoads,
        avgPerLoad,
      },
      arAging,
      carrierPay: Array.from(carrierPayMap.values()).sort((a, b) => b.totalPaid - a.totalPaid),
      loadVolume,
      poStatus,
      margin,
    };
  } catch (error) {
    console.error("[reports] Failed to load reports data:", error);
    return {
      revenue: { byCustomer: [], byMaterial: [], byMonth: [], totalRevenue: 0, totalLoads: 0, avgPerLoad: 0 },
      arAging: [],
      carrierPay: [],
      loadVolume: [],
      poStatus: [],
      margin: [],
    };
  }
}
