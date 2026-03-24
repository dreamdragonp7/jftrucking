import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardKpi {
  todaysLoads: number;
  todaysLoadsTrend: number; // percent change vs 7-day average
  weekLoads: number;
  monthRevenue: number;
  outstandingInvoices: number;
  overdueInvoices: number;
  overdueAmount: number;
  // Margin metrics
  grossMargin: number;
  marginPercent: number;
  carrierPayTotal: number;
  dispatchFeeTotal: number;
  // Payables
  payablesAmount: number;
  payablesCount: number;
}

export interface PendingAction {
  id: string;
  type: "confirmation" | "dispute" | "po_threshold" | "insurance";
  title: string;
  subtitle: string;
  href: string;
  severity: "info" | "warning" | "critical";
}

export interface RecentDelivery {
  id: string;
  deliveryNumber: string;
  material: string;
  weight: number | null;
  unit: string;
  status: "confirmed" | "pending" | "disputed";
  deliveredAt: string;
  driverName: string | null;
  customerName: string | null;
}

export interface ArAgingBucket {
  label: string;
  amount: number;
  color: string;
}

export interface QBHealthData {
  connected: boolean;
  lastSyncAt: string | null;
  failedSyncsCount: number;
  totalSyncsToday: number;
}

export interface DashboardData {
  kpi: DashboardKpi;
  pendingActions: PendingAction[];
  recentDeliveries: RecentDelivery[];
  arAging: ArAgingBucket[];
  revenueByDay: { date: string; revenue: number }[];
  qbHealth: QBHealthData;
}

// ---------------------------------------------------------------------------
// Empty/default data
// ---------------------------------------------------------------------------

const EMPTY_KPI: DashboardKpi = {
  todaysLoads: 0,
  todaysLoadsTrend: 0,
  weekLoads: 0,
  monthRevenue: 0,
  outstandingInvoices: 0,
  overdueInvoices: 0,
  overdueAmount: 0,
  grossMargin: 0,
  marginPercent: 0,
  carrierPayTotal: 0,
  dispatchFeeTotal: 0,
  payablesAmount: 0,
  payablesCount: 0,
};

const EMPTY_QB_HEALTH: QBHealthData = {
  connected: false,
  lastSyncAt: null,
  failedSyncsCount: 0,
  totalSyncsToday: 0,
};

const EMPTY_DASHBOARD: DashboardData = {
  kpi: EMPTY_KPI,
  pendingActions: [],
  recentDeliveries: [],
  arAging: [],
  revenueByDay: [],
  qbHealth: EMPTY_QB_HEALTH,
};

// ---------------------------------------------------------------------------
// Helper: date formatting
// ---------------------------------------------------------------------------

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function startOfWeekISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loadDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { getDemoDashboardData } = await import("@/lib/demo/data");
      return getDemoDashboardData();
    }
    return EMPTY_DASHBOARD;
  }

  const today = todayISO();
  const weekStart = startOfWeekISO();
  const monthStart = startOfMonthISO();
  const sevenDaysAgo = daysAgoISO(7);
  const thirtyDaysAgo = daysAgoISO(30);

  try {
    // Run all queries in parallel
    const [
      todaysLoadsResult,
      weekAvgResult,
      weekLoadsResult,
      monthRevenueResult,
      outstandingResult,
      overdueResult,
      pendingConfResult,
      disputedResult,
      poThresholdResult,
      insuranceResult,
      recentDeliveriesResult,
      arAgingResult,
      revenueTrendResult,
      monthSettlementsResult,
      payablesResult,
      qbLastSyncResult,
      qbFailedResult,
      qbTokensResult,
    ] = await Promise.all([
      // 1. Today's loads count
      supabase
        .from("deliveries")
        .select("id", { count: "exact", head: true })
        .gte("delivered_at", `${today}T00:00:00`)
        .lte("delivered_at", `${today}T23:59:59`),

      // 2. Last 7 days loads for trend (excluding today)
      supabase
        .from("deliveries")
        .select("id", { count: "exact", head: true })
        .gte("delivered_at", `${sevenDaysAgo}T00:00:00`)
        .lt("delivered_at", `${today}T00:00:00`),

      // 3. This week's loads
      supabase
        .from("deliveries")
        .select("id", { count: "exact", head: true })
        .gte("delivered_at", `${weekStart}T00:00:00`),

      // 4. Monthly revenue from invoices
      supabase
        .from("invoices")
        .select("total")
        .gte("created_at", monthStart)
        .in("status", ["sent", "paid"]),

      // 5. Outstanding invoices
      supabase
        .from("invoices")
        .select("total")
        .eq("status", "sent"),

      // 6. Overdue invoices (sent invoices past due date)
      supabase
        .from("invoices")
        .select("total")
        .eq("status", "sent")
        .lt("due_date", today),

      // 7. Pending confirmations
      supabase
        .from("deliveries")
        .select("id", { count: "exact", head: true })
        .eq("confirmation_status", "pending"),

      // 8. Disputed deliveries
      supabase
        .from("deliveries")
        .select("id", { count: "exact", head: true })
        .eq("confirmation_status", "disputed"),

      // 9. POs nearing threshold (>80% consumed)
      supabase
        .from("purchase_orders")
        .select("id, po_number, quantity_ordered, quantity_delivered")
        .eq("status", "active"),

      // 10. Insurance expiring within 30 days
      supabase
        .from("carriers")
        .select("id, name, insurance_expiry")
        .eq("status", "active")
        .lte("insurance_expiry", daysAgoISO(-30))
        .gte("insurance_expiry", today),

      // 11. Recent deliveries
      supabase
        .from("deliveries")
        .select(`
          id,
          ticket_number,
          net_weight,
          confirmation_status,
          delivered_at,
          driver:drivers(name),
          material:materials(name, unit_of_measure),
          dispatch:dispatches(
            purchase_order:purchase_orders(
              customer:customers(name)
            )
          )
        `)
        .order("delivered_at", { ascending: false })
        .limit(10),

      // 12. AR Aging buckets — all outstanding invoices with due_date
      supabase
        .from("invoices")
        .select("total, due_date")
        .eq("status", "sent"),

      // 13. Revenue by day (last 30 days)
      supabase
        .from("invoices")
        .select("total, created_at")
        .gte("created_at", thirtyDaysAgo)
        .in("status", ["sent", "paid"])
        .order("created_at", { ascending: true }),

      // 14. Carrier settlements this month (for margin calc)
      supabase
        .from("carrier_settlements")
        .select("hauling_amount, dispatch_fee, total_amount, status")
        .gte("period_start", monthStart)
        .in("status", ["draft", "approved", "paid"]),

      // 15. Outstanding payables (approved but unpaid settlements)
      supabase
        .from("carrier_settlements")
        .select("total_amount")
        .eq("status", "approved"),

      // 16. QBO: Last successful sync
      supabase
        .from("qb_sync_log")
        .select("synced_at")
        .eq("status", "success")
        .order("synced_at", { ascending: false })
        .limit(1),

      // 17. QBO: Failed syncs in last 24h
      supabase
        .from("qb_sync_log")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("created_at", `${daysAgoISO(1)}T00:00:00`),

      // 18. QBO: Check if tokens exist in app_settings
      supabase
        .from("app_settings")
        .select("key")
        .in("key", ["qbo_access_token", "qbo_refresh_token"])
        .limit(2),
    ]);

    // ---------------------------------------------------------------------------
    // Process KPI data
    // ---------------------------------------------------------------------------

    const todaysLoads = todaysLoadsResult.count ?? 0;
    const past7Loads = weekAvgResult.count ?? 0;
    const dailyAvg = past7Loads / 7;
    const todaysLoadsTrend =
      dailyAvg > 0
        ? Math.round(((todaysLoads - dailyAvg) / dailyAvg) * 100)
        : 0;
    const weekLoads = weekLoadsResult.count ?? 0;

    const monthRevenue = (monthRevenueResult.data ?? []).reduce(
      (sum: number, inv: { total: number }) => sum + (inv.total ?? 0),
      0
    );

    const outstandingInvoices = (outstandingResult.data ?? []).reduce(
      (sum: number, inv: { total: number }) => sum + (inv.total ?? 0),
      0
    );

    const overdueData = overdueResult.data ?? [];
    const overdueInvoices = overdueData.length;
    const overdueAmount = overdueData.reduce(
      (sum: number, inv: { total: number }) => sum + (inv.total ?? 0),
      0
    );

    // ---------------------------------------------------------------------------
    // Process pending actions
    // ---------------------------------------------------------------------------

    const pendingActions: PendingAction[] = [];

    const pendingConfCount = pendingConfResult.count ?? 0;
    if (pendingConfCount > 0) {
      pendingActions.push({
        id: "pending-confirmations",
        type: "confirmation",
        title: `${pendingConfCount} deliver${pendingConfCount === 1 ? "y" : "ies"} awaiting confirmation`,
        subtitle: "Customer confirmation needed",
        href: "/admin/deliveries?status=pending",
        severity: "warning",
      });
    }

    const disputedCount = disputedResult.count ?? 0;
    if (disputedCount > 0) {
      pendingActions.push({
        id: "disputes",
        type: "dispute",
        title: `${disputedCount} dispute${disputedCount === 1 ? "" : "s"} need review`,
        subtitle: "Customer disputes require attention",
        href: "/admin/disputes",
        severity: "critical",
      });
    }

    // POs nearing threshold
    const activePOs = poThresholdResult.data ?? [];
    for (const po of activePOs) {
      const totalQty = (po as { quantity_ordered?: number }).quantity_ordered ?? 0;
      const deliveredQty =
        (po as { quantity_delivered?: number }).quantity_delivered ?? 0;
      if (totalQty > 0 && deliveredQty / totalQty >= 0.8) {
        const pct = Math.round((deliveredQty / totalQty) * 100);
        pendingActions.push({
          id: `po-${po.id}`,
          type: "po_threshold",
          title: `PO #${(po as { po_number?: string }).po_number}: ${pct}% consumed`,
          subtitle: `${deliveredQty} of ${totalQty} units delivered`,
          href: `/admin/rates`,
          severity: pct >= 95 ? "critical" : "warning",
        });
      }
    }

    // Insurance expiries
    const expiringCarriers = insuranceResult.data ?? [];
    for (const carrier of expiringCarriers) {
      const c = carrier as { id: string; name: string; insurance_expiry: string };
      const expiryDate = new Date(c.insurance_expiry);
      const daysUntil = Math.ceil(
        (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      pendingActions.push({
        id: `insurance-${c.id}`,
        type: "insurance",
        title: `${c.name}: Insurance expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
        subtitle: `Expiry: ${expiryDate.toLocaleDateString()}`,
        href: "/admin/carriers",
        severity: daysUntil <= 7 ? "critical" : "warning",
      });
    }

    // ---------------------------------------------------------------------------
    // Process recent deliveries
    // ---------------------------------------------------------------------------

    const recentDeliveries: RecentDelivery[] = (
      recentDeliveriesResult.data ?? []
    ).map((d: Record<string, unknown>) => {
      const driver = d.driver as { name?: string } | null;
      const material = d.material as { name?: string; unit_of_measure?: string } | null;
      const dispatch = d.dispatch as {
        purchase_order?: { customer?: { name?: string } };
      } | null;

      return {
        id: d.id as string,
        deliveryNumber: (d.ticket_number as string) ?? "---",
        material: material?.name ?? "Unknown",
        weight: d.net_weight as number | null,
        unit: material?.unit_of_measure ?? "ton",
        status: d.confirmation_status as RecentDelivery["status"],
        deliveredAt: d.delivered_at as string,
        driverName: driver?.name ?? null,
        customerName: dispatch?.purchase_order?.customer?.name ?? null,
      };
    });

    // ---------------------------------------------------------------------------
    // Process AR Aging
    // ---------------------------------------------------------------------------

    const arData = arAgingResult.data ?? [];
    const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };

    for (const inv of arData as { total: number; due_date: string }[]) {
      const dueDate = new Date(inv.due_date);
      const daysOverdue = Math.floor(
        (Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue <= 0) buckets.current += inv.total;
      else if (daysOverdue <= 30) buckets["1-30"] += inv.total;
      else if (daysOverdue <= 60) buckets["31-60"] += inv.total;
      else if (daysOverdue <= 90) buckets["61-90"] += inv.total;
      else buckets["90+"] += inv.total;
    }

    const arAging: ArAgingBucket[] = [
      { label: "Current", amount: buckets.current, color: "#4ADE80" },
      { label: "1-30 days", amount: buckets["1-30"], color: "#EDBC18" },
      { label: "31-60 days", amount: buckets["31-60"], color: "#FBB040" },
      { label: "61-90 days", amount: buckets["61-90"], color: "#F97316" },
      { label: "90+ days", amount: buckets["90+"], color: "#C75030" },
    ];

    // ---------------------------------------------------------------------------
    // Process revenue trend
    // ---------------------------------------------------------------------------

    const revenueTrendData = revenueTrendResult.data ?? [];
    const revenueByDayMap = new Map<string, number>();

    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      revenueByDayMap.set(daysAgoISO(i), 0);
    }

    for (const inv of revenueTrendData as { total: number; created_at: string }[]) {
      const day = inv.created_at.split("T")[0];
      revenueByDayMap.set(day, (revenueByDayMap.get(day) ?? 0) + inv.total);
    }

    const revenueByDay = Array.from(revenueByDayMap.entries()).map(
      ([date, revenue]) => ({ date, revenue })
    );

    // ---------------------------------------------------------------------------
    // Process margin & payables
    // ---------------------------------------------------------------------------

    const monthSettlements = monthSettlementsResult.data ?? [];
    const carrierPayTotal = monthSettlements.reduce(
      (sum: number, s: { hauling_amount: number }) => sum + (s.hauling_amount ?? 0),
      0
    );
    const dispatchFeeTotal = monthSettlements.reduce(
      (sum: number, s: { dispatch_fee: number }) => sum + (s.dispatch_fee ?? 0),
      0
    );
    const grossMargin = monthRevenue - carrierPayTotal - dispatchFeeTotal;
    const marginPercent =
      monthRevenue > 0 ? Math.round((grossMargin / monthRevenue) * 100) : 0;

    const payablesData = payablesResult.data ?? [];
    const payablesAmount = payablesData.reduce(
      (sum: number, s: { total_amount: number }) => sum + (s.total_amount ?? 0),
      0
    );
    const payablesCount = payablesData.length;

    // ---------------------------------------------------------------------------
    // Process QBO Health
    // ---------------------------------------------------------------------------

    const qbLastSync = qbLastSyncResult.data?.[0] as { synced_at: string } | undefined;
    const qbFailedCount = qbFailedResult.count ?? 0;
    const qbTokens = qbTokensResult.data ?? [];
    const qbConnected = qbTokens.length >= 2; // both access_token and refresh_token exist

    const qbHealth: QBHealthData = {
      connected: qbConnected,
      lastSyncAt: qbLastSync?.synced_at ?? null,
      failedSyncsCount: qbFailedCount,
      totalSyncsToday: 0, // Could add another query if needed
    };

    return {
      kpi: {
        todaysLoads,
        todaysLoadsTrend,
        weekLoads,
        monthRevenue,
        outstandingInvoices,
        overdueInvoices,
        overdueAmount,
        grossMargin,
        marginPercent,
        carrierPayTotal,
        dispatchFeeTotal,
        payablesAmount,
        payablesCount,
      },
      pendingActions,
      recentDeliveries,
      arAging,
      revenueByDay,
      qbHealth,
    };
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
    return EMPTY_DASHBOARD;
  }
}
