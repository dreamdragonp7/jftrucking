"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Truck,
  FileText,
  Users,
  Download,
  Package,
  ClipboardList,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { ReportsData } from "../_lib/reports.loader";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIE_COLORS = ["#EDBC18", "#C8A415", "#A08A12", "#78700F", "#D4A017", "#E6C832", "#F0D64C"];

const fmtMoney = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtMoneyShort = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

// ---------------------------------------------------------------------------
// CSV Export helper
// ---------------------------------------------------------------------------

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// KPI Stat
// ---------------------------------------------------------------------------

function StatCard({ title, value, subtitle, icon: Icon }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-gold/10 text-brand-gold flex-shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">{title}</p>
            <p className="text-lg font-bold font-mono text-[var(--color-text-primary)]">{value}</p>
            {subtitle && <p className="text-xs text-[var(--color-text-secondary)]">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Revenue Tab
// ---------------------------------------------------------------------------

function RevenueTab({ data }: { data: ReportsData }) {
  const { revenue } = data;

  const revenueChartConfig: ChartConfig = {
    revenue: { label: "Revenue", color: "#EDBC18" },
  };

  const materialChartConfig: ChartConfig = {};
  revenue.byMaterial.forEach((m, i) => {
    materialChartConfig[m.materialName] = {
      label: m.materialName,
      color: PIE_COLORS[i % PIE_COLORS.length],
    };
  });

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Total Revenue" value={fmtMoney(revenue.totalRevenue)} icon={DollarSign} />
        <StatCard title="Total Invoices" value={revenue.totalLoads.toLocaleString()} icon={FileText} />
        <StatCard title="Avg Per Invoice" value={fmtMoney(revenue.avgPerLoad)} icon={TrendingUp} />
      </div>

      {/* Revenue trend line chart */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over time</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCSV(
              "revenue-by-month.csv",
              ["Month", "Revenue", "Invoices"],
              revenue.byMonth.map((r) => [r.month, r.revenue.toFixed(2), r.loads.toString()])
            )}
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          {revenue.byMonth.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No revenue data for this period</p>
          ) : (
            <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
              <LineChart data={revenue.byMonth} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtMoneyShort} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmtMoney(value as number)} />} />
                <Line type="monotone" dataKey="revenue" stroke="#EDBC18" strokeWidth={2} dot={{ fill: "#EDBC18" }} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Customer */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Revenue by Customer</CardTitle>
              <CardDescription>Top customers by revenue</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCSV(
                "revenue-by-customer.csv",
                ["Customer", "Revenue", "Invoices"],
                revenue.byCustomer.map((r) => [`"${r.customerName}"`, r.revenue.toFixed(2), r.loads.toString()])
              )}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {revenue.byCustomer.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No data</p>
            ) : (
              <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
                <BarChart data={revenue.byCustomer.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tickFormatter={fmtMoneyShort} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="customerName" tick={{ fontSize: 11 }} width={75} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmtMoney(value as number)} />} />
                  <Bar dataKey="revenue" fill="#EDBC18" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Material */}
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader>
            <CardTitle className="text-base">Revenue by Material</CardTitle>
            <CardDescription>Breakdown by material type</CardDescription>
          </CardHeader>
          <CardContent>
            {revenue.byMaterial.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No data</p>
            ) : (
              <ChartContainer config={materialChartConfig} className="h-[300px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmtMoney(value as number)} />} />
                  <Pie
                    data={revenue.byMaterial}
                    dataKey="revenue"
                    nameKey="materialName"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ materialName, percent }) => `${materialName} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {revenue.byMaterial.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AR Aging Tab
// ---------------------------------------------------------------------------

function ArAgingTab({ data }: { data: ReportsData }) {
  const buckets = useMemo(() => {
    const b = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    for (const row of data.arAging) {
      b[row.bucket] += row.total;
    }
    return b;
  }, [data.arAging]);

  const total = Object.values(buckets).reduce((sum, v) => sum + v, 0);
  const overdue = total - buckets.current;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Total Outstanding" value={fmtMoney(total)} icon={FileText} />
        <StatCard title="Overdue Amount" value={fmtMoney(overdue)} subtitle={overdue > 0 ? "Requires attention" : "All current"} icon={DollarSign} />
        <StatCard title="Invoices" value={data.arAging.length.toLocaleString()} icon={FileText} />
      </div>

      {/* Aging buckets */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Aging Summary</CardTitle>
            <CardDescription>Outstanding balances by age</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCSV(
              "ar-aging.csv",
              ["Invoice", "Customer", "Amount", "Due Date", "Days Overdue", "Bucket", "Status"],
              data.arAging.map((r) => [r.invoiceNumber, `"${r.customerName}"`, r.total.toFixed(2), r.dueDate, r.daysOverdue.toString(), r.bucket, r.status])
            )}
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              { label: "Current", amount: buckets.current, color: "text-emerald-600" },
              { label: "1-30 days", amount: buckets["1-30"], color: "text-amber-600" },
              { label: "31-60 days", amount: buckets["31-60"], color: "text-orange-600" },
              { label: "61-90 days", amount: buckets["61-90"], color: "text-orange-500" },
              { label: "90+ days", amount: buckets["90+"], color: "text-red-600" },
            ].map((b) => (
              <div key={b.label} className="text-center">
                <p className="text-xs text-[var(--color-text-muted)]">{b.label}</p>
                <p className={`text-sm font-bold font-mono ${b.color}`}>{fmtMoney(b.amount)}</p>
              </div>
            ))}
          </div>

          {/* Invoice table */}
          {data.arAging.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No outstanding invoices</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Invoice</th>
                    <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Customer</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Amount</th>
                    <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Due Date</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Days</th>
                    <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.arAging.map((row) => (
                    <tr key={row.invoiceId} className="border-b border-[var(--color-border-subtle)]">
                      <td className="py-2 font-mono text-xs">{row.invoiceNumber}</td>
                      <td className="py-2 text-[var(--color-text-primary)]">{row.customerName}</td>
                      <td className={`py-2 text-right font-mono ${row.daysOverdue > 60 ? "text-red-600" : row.daysOverdue > 30 ? "text-orange-600" : ""}`}>
                        {fmtMoney(row.total)}
                      </td>
                      <td className="py-2 text-[var(--color-text-secondary)]">{new Date(row.dueDate).toLocaleDateString()}</td>
                      <td className="py-2 text-right font-mono">{row.daysOverdue > 0 ? row.daysOverdue : "-"}</td>
                      <td className="py-2"><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carrier Pay Tab
// ---------------------------------------------------------------------------

function CarrierPayTab({ data }: { data: ReportsData }) {
  const totals = useMemo(() => {
    return data.carrierPay.reduce(
      (acc, r) => ({
        hauling: acc.hauling + r.haulingAmount,
        fees: acc.fees + r.dispatchFee,
        deductions: acc.deductions + r.deductions,
        total: acc.total + r.totalPaid,
      }),
      { hauling: 0, fees: 0, deductions: 0, total: 0 }
    );
  }, [data.carrierPay]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard title="Total Hauling" value={fmtMoney(totals.hauling)} icon={Truck} />
        <StatCard title="Dispatch Fees" value={fmtMoney(totals.fees)} icon={DollarSign} />
        <StatCard title="Deductions" value={fmtMoney(totals.deductions)} icon={DollarSign} />
        <StatCard title="Net Paid" value={fmtMoney(totals.total)} icon={DollarSign} />
      </div>

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Carrier Pay Summary</CardTitle>
            <CardDescription>Year-to-date payments by carrier (for 1099 reporting)</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCSV(
              "carrier-pay.csv",
              ["Carrier", "Hauling Amount", "Dispatch Fee", "Deductions", "Total Paid", "Settlements"],
              data.carrierPay.map((r) => [`"${r.carrierName}"`, r.haulingAmount.toFixed(2), r.dispatchFee.toFixed(2), r.deductions.toFixed(2), r.totalPaid.toFixed(2), r.settlements.toString()])
            )}
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          {data.carrierPay.length === 0 ? (
            <EmptyState icon={Users} title="No carrier payments" description="Carrier settlement data will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Carrier</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Hauling</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Fees</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Deductions</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Total Paid</th>
                    <th className="text-center py-2 text-xs font-medium text-[var(--color-text-muted)]">1099 Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.carrierPay.map((row) => (
                    <tr key={row.carrierId} className="border-b border-[var(--color-border-subtle)]">
                      <td className="py-2 font-medium text-[var(--color-text-primary)]">{row.carrierName}</td>
                      <td className="py-2 text-right font-mono">{fmtMoney(row.haulingAmount)}</td>
                      <td className="py-2 text-right font-mono">{fmtMoney(row.dispatchFee)}</td>
                      <td className="py-2 text-right font-mono">{fmtMoney(row.deductions)}</td>
                      <td className="py-2 text-right font-mono font-semibold">{fmtMoney(row.totalPaid)}</td>
                      <td className="py-2 text-center">
                        <StatusBadge status={row.totalPaid >= 2000 ? "overdue" : "active"} label={row.totalPaid >= 2000 ? "1099 Required" : "Below Threshold"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border)] font-semibold">
                    <td className="py-2 text-[var(--color-text-primary)]">Total</td>
                    <td className="py-2 text-right font-mono">{fmtMoney(totals.hauling)}</td>
                    <td className="py-2 text-right font-mono">{fmtMoney(totals.fees)}</td>
                    <td className="py-2 text-right font-mono">{fmtMoney(totals.deductions)}</td>
                    <td className="py-2 text-right font-mono">{fmtMoney(totals.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Load Volume Tab
// ---------------------------------------------------------------------------

function LoadVolumeTab({ data }: { data: ReportsData }) {
  const totalLoads = data.loadVolume.reduce((sum, d) => sum + d.loads, 0);
  const avgPerDay = data.loadVolume.length > 0 ? Math.round(totalLoads / data.loadVolume.length) : 0;
  const peakDay = data.loadVolume.reduce((max, d) => d.loads > max.loads ? d : max, { date: "-", loads: 0 });

  const chartConfig: ChartConfig = {
    loads: { label: "Loads", color: "#EDBC18" },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Total Loads" value={totalLoads.toLocaleString()} icon={Truck} />
        <StatCard title="Avg Per Day" value={avgPerDay.toLocaleString()} icon={BarChart3} />
        <StatCard title="Peak Day" value={`${peakDay.loads} loads`} subtitle={peakDay.date !== "-" ? new Date(peakDay.date).toLocaleDateString() : ""} icon={TrendingUp} />
      </div>

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Daily Load Volume</CardTitle>
            <CardDescription>Number of deliveries per day</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCSV(
              "load-volume.csv",
              ["Date", "Loads"],
              data.loadVolume.map((d) => [d.date, d.loads.toString()])
            )}
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          {data.loadVolume.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No load data for this period</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={data.loadVolume} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="loads" fill="#EDBC18" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PO Status Tab
// ---------------------------------------------------------------------------

function POStatusTab({ data }: { data: ReportsData }) {
  return (
    <div className="space-y-6">
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Active Purchase Orders</CardTitle>
            <CardDescription>Fulfillment progress for all active POs</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCSV(
              "po-status.csv",
              ["PO Number", "Customer", "Material", "Ordered", "Delivered", "% Complete"],
              data.poStatus.map((r) => [r.poNumber, `"${r.customerName}"`, `"${r.materialName}"`, r.quantityOrdered.toString(), r.quantityDelivered.toString(), `${r.percentComplete}%`])
            )}
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          {data.poStatus.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No active POs" description="Active purchase orders will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">PO #</th>
                    <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Customer</th>
                    <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Material</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Ordered</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Delivered</th>
                    <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {data.poStatus.map((po) => (
                    <tr key={po.id} className="border-b border-[var(--color-border-subtle)]">
                      <td className="py-2 font-mono text-xs font-semibold text-[var(--color-text-primary)]">{po.poNumber}</td>
                      <td className="py-2 text-[var(--color-text-primary)]">{po.customerName}</td>
                      <td className="py-2 text-[var(--color-text-secondary)]">{po.materialName}</td>
                      <td className="py-2 text-right font-mono">{po.quantityOrdered.toLocaleString()}</td>
                      <td className="py-2 text-right font-mono">{po.quantityDelivered.toLocaleString()}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[var(--color-surface-deep)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${po.percentComplete >= 95 ? "bg-red-400" : po.percentComplete >= 80 ? "bg-amber-400" : "bg-emerald-400"}`}
                              style={{ width: `${Math.min(100, po.percentComplete)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-mono font-semibold ${po.percentComplete >= 95 ? "text-red-600" : po.percentComplete >= 80 ? "text-amber-600" : "text-emerald-600"}`}>
                            {po.percentComplete}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Margin Tab
// ---------------------------------------------------------------------------

function MarginTab({ data }: { data: ReportsData }) {
  const totals = useMemo(() => {
    return data.margin.reduce(
      (acc, r) => ({
        revenue: acc.revenue + r.revenue,
        carrierPay: acc.carrierPay + r.carrierPay,
        dispatchFees: acc.dispatchFees + r.dispatchFees,
        grossMargin: acc.grossMargin + r.grossMargin,
      }),
      { revenue: 0, carrierPay: 0, dispatchFees: 0, grossMargin: 0 }
    );
  }, [data.margin]);

  const overallPercent = totals.revenue > 0 ? Math.round((totals.grossMargin / totals.revenue) * 100) : 0;

  const chartConfig: ChartConfig = {
    revenue: { label: "Revenue", color: "#EDBC18" },
    grossMargin: { label: "Gross Margin", color: "#4ADE80" },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard title="Total Revenue" value={fmtMoney(totals.revenue)} icon={DollarSign} />
        <StatCard title="Carrier Costs" value={fmtMoney(totals.carrierPay + totals.dispatchFees)} icon={Truck} />
        <StatCard title="Gross Margin" value={fmtMoney(totals.grossMargin)} icon={TrendingUp} />
        <StatCard title="Margin %" value={`${overallPercent}%`} subtitle={overallPercent >= 30 ? "Healthy" : overallPercent >= 20 ? "Acceptable" : "Below target"} icon={TrendingUp} />
      </div>

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Margin Trend</CardTitle>
            <CardDescription>Revenue vs gross margin by month</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCSV(
              "margin-report.csv",
              ["Period", "Revenue", "Carrier Pay", "Dispatch Fees", "Gross Margin", "Margin %"],
              data.margin.map((r) => [r.period, r.revenue.toFixed(2), r.carrierPay.toFixed(2), r.dispatchFees.toFixed(2), r.grossMargin.toFixed(2), `${r.marginPercent}%`])
            )}
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          {data.margin.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No margin data for this period</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={data.margin} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmtMoneyShort} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmtMoney(value as number)} />} />
                <Bar dataKey="revenue" fill="#EDBC18" radius={[2, 2, 0, 0]} />
                <Bar dataKey="grossMargin" fill="#4ADE80" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly margin table */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="text-base">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {data.margin.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Period</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Revenue</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Carrier Pay</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Fees</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Margin</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.margin.map((r) => (
                    <tr key={r.period} className="border-b border-[var(--color-border-subtle)]">
                      <td className="py-2 font-medium text-[var(--color-text-primary)]">{r.period}</td>
                      <td className="py-2 text-right font-mono">{fmtMoney(r.revenue)}</td>
                      <td className="py-2 text-right font-mono">{fmtMoney(r.carrierPay)}</td>
                      <td className="py-2 text-right font-mono">{fmtMoney(r.dispatchFees)}</td>
                      <td className={`py-2 text-right font-mono font-semibold ${r.grossMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {fmtMoney(r.grossMargin)}
                      </td>
                      <td className={`py-2 text-right font-mono font-semibold ${r.marginPercent >= 30 ? "text-emerald-600" : r.marginPercent >= 20 ? "text-amber-600" : "text-red-600"}`}>
                        {r.marginPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border)] font-semibold">
                    <td className="py-2 text-[var(--color-text-primary)]">Total</td>
                    <td className="py-2 text-right font-mono">{fmtMoney(totals.revenue)}</td>
                    <td className="py-2 text-right font-mono">{fmtMoney(totals.carrierPay)}</td>
                    <td className="py-2 text-right font-mono">{fmtMoney(totals.dispatchFees)}</td>
                    <td className="py-2 text-right font-mono text-emerald-600">{fmtMoney(totals.grossMargin)}</td>
                    <td className="py-2 text-right font-mono">{overallPercent}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReportsClient
// ---------------------------------------------------------------------------

export function ReportsClient({ data }: { data: ReportsData }) {
  return (
    <Tabs defaultValue="revenue" className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="revenue" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Revenue</span>
          </TabsTrigger>
          <TabsTrigger value="margin" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Margin</span>
          </TabsTrigger>
          <TabsTrigger value="ar-aging" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AR Aging</span>
          </TabsTrigger>
          <TabsTrigger value="carrier-pay" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Carrier Pay</span>
          </TabsTrigger>
          <TabsTrigger value="load-volume" className="gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Loads</span>
          </TabsTrigger>
          <TabsTrigger value="po-status" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">POs</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="revenue"><RevenueTab data={data} /></TabsContent>
      <TabsContent value="margin"><MarginTab data={data} /></TabsContent>
      <TabsContent value="ar-aging"><ArAgingTab data={data} /></TabsContent>
      <TabsContent value="carrier-pay"><CarrierPayTab data={data} /></TabsContent>
      <TabsContent value="load-volume"><LoadVolumeTab data={data} /></TabsContent>
      <TabsContent value="po-status"><POStatusTab data={data} /></TabsContent>
    </Tabs>
  );
}
