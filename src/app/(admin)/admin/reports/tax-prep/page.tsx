import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { TaxPrepClient } from "./_components/TaxPrepClient";

export const metadata: Metadata = {
  title: "Tax Prep",
};

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuarterData {
  quarter: string;
  label: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  dueDate: string;
  status: "paid" | "upcoming" | "overdue" | "not_due";
}

export interface VendorRow {
  id: string;
  name: string;
  ein: string | null;
  totalPaid: number;
  requires1099: boolean;
  w9OnFile: boolean;
  w9Url: string | null;
}

export interface TaxPrepData {
  year: number;
  quarters: QuarterData[];
  vendors: VendorRow[];
  annualRevenue: number;
  annualExpenses: number;
  annualNetProfit: number;
  totalVendorPayments: number;
  materials: Array<{ name: string; revenue: number }>;
}

// ---------------------------------------------------------------------------
// Data Loader
// ---------------------------------------------------------------------------

async function loadTaxPrepData(): Promise<TaxPrepData> {
  const supabase = await createClient();
  const year = new Date().getFullYear();

  const empty: TaxPrepData = {
    year,
    quarters: [],
    vendors: [],
    annualRevenue: 0,
    annualExpenses: 0,
    annualNetProfit: 0,
    totalVendorPayments: 0,
    materials: [],
  };

  if (!supabase) return empty;

  const currentMonth = new Date().getMonth(); // 0-indexed

  try {
    const [invoicesResult, lineItemsResult, settlementsResult, carriersResult] =
      await Promise.all([
        // All paid invoices this tax year (revenue)
        supabase
          .from("invoices")
          .select("id, total, created_at")
          .gte("created_at", `${year}-01-01`)
          .lte("created_at", `${year}-12-31T23:59:59`)
          .in("status", ["sent", "paid"]),

        // Line items with material join (for categorized revenue)
        supabase
          .from("invoice_line_items")
          .select(
            "amount, material_id, invoice_id, material:materials(name)"
          ),

        // All carrier settlements this year (expenses)
        supabase
          .from("carrier_settlements")
          .select("carrier_id, total_amount, period_start")
          .gte("period_start", `${year}-01-01`)
          .lte("period_start", `${year}-12-31`)
          .in("status", ["approved", "paid"]),

        // Carriers for 1099 / W-9 tracking
        supabase
          .from("carriers")
          .select("id, name, ein, w9_url")
          .eq("status", "active"),
      ]);

    const invoices = (invoicesResult.data ?? []) as Array<{
      id: string;
      total: number;
      created_at: string;
    }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItemsRaw = (lineItemsResult.data ?? []) as any[];
    const lineItems = lineItemsRaw.map((li) => ({
      amount: li.amount as number,
      material_id: li.material_id as string | null,
      invoice_id: li.invoice_id as string,
      // Supabase may return joined material as object or array depending on FK
      material: Array.isArray(li.material)
        ? (li.material[0] as { name: string } | undefined) ?? null
        : (li.material as { name: string } | null),
    }));
    const settlements = (settlementsResult.data ?? []) as Array<{
      carrier_id: string;
      total_amount: number;
      period_start: string;
    }>;
    const carriers = (carriersResult.data ?? []) as Array<{
      id: string;
      name: string;
      ein: string | null;
      w9_url: string | null;
    }>;

    // Build set of invoice IDs in this year for filtering line items
    const invoiceIds = new Set(invoices.map((i) => i.id));

    // --- Material revenue breakdown ---
    const materialRevMap = new Map<string, number>();
    for (const li of lineItems) {
      if (!invoiceIds.has(li.invoice_id)) continue;
      const name = li.material?.name ?? "Other";
      materialRevMap.set(name, (materialRevMap.get(name) ?? 0) + li.amount);
    }
    const materials = Array.from(materialRevMap.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // --- Quarterly revenue ---
    const quarterRevenue = [0, 0, 0, 0];
    for (const inv of invoices) {
      const month = new Date(inv.created_at).getMonth();
      const quarter = Math.floor(month / 3);
      quarterRevenue[quarter] += inv.total;
    }
    const annualRevenue = quarterRevenue.reduce((sum, v) => sum + v, 0);

    // --- Quarterly expenses ---
    const quarterExpenses = [0, 0, 0, 0];
    for (const s of settlements) {
      const month = new Date(s.period_start).getMonth();
      const quarter = Math.floor(month / 3);
      quarterExpenses[quarter] += s.total_amount;
    }
    const annualExpenses = quarterExpenses.reduce((sum, v) => sum + v, 0);
    const annualNetProfit = annualRevenue - annualExpenses;

    // --- Quarterly due dates and status ---
    const quarterDueDates = [
      `April 15, ${year}`,
      `June 15, ${year}`,
      `September 15, ${year}`,
      `January 15, ${year + 1}`,
    ];

    const quarterEndMonths = [2, 5, 8, 11]; // Mar, Jun, Sep, Dec (0-indexed)
    const today = new Date();

    const quarters: QuarterData[] = quarterRevenue.map((revenue, i) => {
      const expenses = quarterExpenses[i];
      const netProfit = revenue - expenses;
      const dueDate = new Date(quarterDueDates[i]);
      let status: QuarterData["status"] = "not_due";

      if (currentMonth > quarterEndMonths[i]) {
        status = today > dueDate ? "overdue" : "upcoming";
      } else if (currentMonth >= quarterEndMonths[i] - 2) {
        status = "upcoming";
      }

      return {
        quarter: `Q${i + 1}`,
        label: `Q${i + 1} ${year}`,
        revenue,
        expenses,
        netProfit,
        dueDate: quarterDueDates[i],
        status,
      };
    });

    // --- Vendor / carrier payments for 1099 tracking ---
    const vendorMap = new Map<string, number>();
    for (const s of settlements) {
      vendorMap.set(
        s.carrier_id,
        (vendorMap.get(s.carrier_id) ?? 0) + s.total_amount
      );
    }
    const totalVendorPayments = Array.from(vendorMap.values()).reduce(
      (sum, v) => sum + v,
      0
    );

    const vendors: VendorRow[] = carriers
      .map((c) => {
        const totalPaid = vendorMap.get(c.id) ?? 0;
        return {
          id: c.id,
          name: c.name,
          ein: c.ein,
          totalPaid,
          requires1099: totalPaid >= 600,
          w9OnFile: Boolean(c.w9_url),
          w9Url: c.w9_url,
        };
      })
      .sort((a, b) => b.totalPaid - a.totalPaid);

    return {
      year,
      quarters,
      vendors,
      annualRevenue,
      annualExpenses,
      annualNetProfit,
      totalVendorPayments,
      materials,
    };
  } catch (error) {
    console.error("[tax-prep] Failed to load data:", error);
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

async function TaxPrepContent() {
  const data = await loadTaxPrepData();
  return <TaxPrepClient data={data} />;
}

function TaxPrepSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-48 rounded-lg" />
      ))}
    </div>
  );
}

export default function TaxPrepPage() {
  return (
    <div className="animate-slide-up-fade space-y-6">
      <PageHeader
        iconName="file-text"
        title="Tax Prep"
        description="Quarterly estimates, 1099 tracking, and filing checklist -- no CPA required"
      />

      <Suspense fallback={<TaxPrepSkeleton />}>
        <TaxPrepContent />
      </Suspense>
    </div>
  );
}
