"use client";

import { useState, useRef } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Users,
  Building2,
  Calendar,
  Shield,
  Printer,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/admin/StatusBadge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuarterData {
  quarter: string;
  label: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  dueDate: string;
  status: "paid" | "upcoming" | "overdue" | "not_due";
}

interface VendorRow {
  id: string;
  name: string;
  ein: string | null;
  totalPaid: number;
  requires1099: boolean;
  w9OnFile: boolean;
  w9Url: string | null;
}

interface TaxPrepData {
  year: number;
  quarters: QuarterData[];
  vendors: VendorRow[];
  annualRevenue: number;
  annualExpenses: number;
  annualNetProfit: number;
  totalVendorPayments: number;
  materials: Array<{ name: string; revenue: number }>;
}

interface TaxPrepClientProps {
  data: TaxPrepData;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SE_TAX_RATE = 0.153; // 15.3% self-employment tax
const SE_TAX_BASE = 0.9235; // 92.35% of net profit is taxable for SE
const DEFAULT_INCOME_TAX_RATE = 0.22; // 22% effective income tax bracket
const THRESHOLD_1099 = 600; // IRS 1099-NEC threshold

// IRS quarterly due dates
const IRS_QUARTER_LABELS = ["Q1 (Jan-Mar)", "Q2 (Apr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Dec)"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtMoney = (n: number) =>
  `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${n < 0 ? " (loss)" : ""}`;

const maskEIN = (ein: string | null) => {
  if (!ein) return "Not on file";
  if (ein.length < 4) return "***";
  return `***-**-${ein.slice(-4)}`;
};

// ---------------------------------------------------------------------------
// TaxPrepClient
// ---------------------------------------------------------------------------

export function TaxPrepClient({ data }: TaxPrepClientProps) {
  const { year, quarters, vendors, annualRevenue, annualExpenses, annualNetProfit, totalVendorPayments, materials } = data;
  const printRef = useRef<HTMLDivElement>(null);

  // Editable income tax rate
  const [incomeTaxRate, setIncomeTaxRate] = useState(DEFAULT_INCOME_TAX_RATE);

  // Tax calculations
  const seTaxableBase = annualNetProfit > 0 ? annualNetProfit * SE_TAX_BASE : 0;
  const annualSETax = seTaxableBase * SE_TAX_RATE;
  const annualIncomeTax = annualNetProfit > 0 ? annualNetProfit * incomeTaxRate : 0;
  const totalEstimatedTax = annualSETax + annualIncomeTax;

  // Per-quarter estimates
  const quarterlyEstimates = quarters.map((q) => {
    const qNetProfit = q.netProfit > 0 ? q.netProfit : 0;
    const qSETax = qNetProfit * SE_TAX_BASE * SE_TAX_RATE;
    const qIncomeTax = qNetProfit * incomeTaxRate;
    return {
      ...q,
      seTax: qSETax,
      incomeTax: qIncomeTax,
      totalTax: qSETax + qIncomeTax,
    };
  });

  // Texas Franchise Tax
  const franchiseTaxThreshold = 2_650_000;
  const isUnderThreshold = annualRevenue < franchiseTaxThreshold;

  // 1099 tracking
  const vendorsRequiring1099 = vendors.filter((v) => v.requires1099);
  const vendorsWithoutW9 = vendors.filter((v) => v.requires1099 && !v.w9OnFile);
  const vendorsApproaching600 = vendors.filter((v) => v.totalPaid >= 400 && v.totalPaid < 600);

  // Build action items
  const actionItems: Array<{ severity: "error" | "warning" | "info"; message: string }> = [];

  // Quarterly tax alerts
  for (const q of quarterlyEstimates) {
    if (q.status === "overdue" && q.totalTax > 0) {
      actionItems.push({
        severity: "error",
        message: `${q.label} estimated tax of ${fmtMoney(q.totalTax)} was due ${q.dueDate} -- pay ASAP to avoid penalties`,
      });
    } else if (q.status === "upcoming" && q.totalTax > 0) {
      actionItems.push({
        severity: "warning",
        message: `${q.label} estimated tax of ${fmtMoney(q.totalTax)} due ${q.dueDate}`,
      });
    }
  }

  // 1099 alerts
  for (const v of vendorsRequiring1099) {
    if (!v.w9OnFile) {
      actionItems.push({
        severity: "error",
        message: `Missing W-9 from ${v.name} (paid ${fmtMoney(v.totalPaid)}) -- get it before year-end`,
      });
    }
    actionItems.push({
      severity: "info",
      message: `${v.name} paid ${fmtMoney(v.totalPaid)} -- 1099-NEC required by January 31, ${year + 1}`,
    });
  }

  // Approaching threshold
  for (const v of vendorsApproaching600) {
    actionItems.push({
      severity: "warning",
      message: `${v.name} approaching $600 threshold (${fmtMoney(v.totalPaid)} paid) -- W-9 ${v.w9OnFile ? "on file" : "NOT on file"}`,
    });
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div ref={printRef} className="space-y-6">
      {/* ================================================================ */}
      {/* PRINT-ONLY HEADER (hidden on screen) */}
      {/* ================================================================ */}
      <div className="hidden print:block print:mb-6">
        <h1 className="text-2xl font-bold">J Fudge Trucking Inc -- Tax Summary {year}</h1>
        <p className="text-sm text-gray-600">
          Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          ESTIMATES ONLY -- These are calculated estimates for planning purposes. Consult a tax professional for final filing.
        </p>
        <hr className="mt-3" />
      </div>

      {/* ================================================================ */}
      {/* ACTION ITEMS */}
      {/* ================================================================ */}
      {actionItems.length > 0 && (
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader className="flex flex-row items-center justify-between print:pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-brand-gold" />
                Action Items
              </CardTitle>
              <CardDescription>{actionItems.length} item{actionItems.length !== 1 ? "s" : ""} requiring attention</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="print:hidden"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Tax Summary
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {actionItems.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    item.severity === "error"
                      ? "border-red-200 bg-red-50 text-red-800"
                      : item.severity === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-blue-200 bg-blue-50 text-blue-800"
                  }`}
                >
                  {item.severity === "error" ? (
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  ) : item.severity === "warning" ? (
                    <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm">{item.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* ANNUAL SUMMARY CARDS */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <TrendingUp className="h-3.5 w-3.5" />
            Annual Revenue
          </div>
          <p className="text-lg font-bold font-mono text-[var(--color-text-primary)] mt-1">{fmtMoney(annualRevenue)}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <TrendingDown className="h-3.5 w-3.5" />
            Annual Expenses
          </div>
          <p className="text-lg font-bold font-mono text-[var(--color-text-primary)] mt-1">{fmtMoney(annualExpenses)}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <DollarSign className="h-3.5 w-3.5" />
            Net Profit
          </div>
          <p className={`text-lg font-bold font-mono mt-1 ${annualNetProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {fmtMoney(annualNetProfit)}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <Shield className="h-3.5 w-3.5" />
            Est. Total Tax
          </div>
          <p className="text-lg font-bold font-mono text-red-600 mt-1">{fmtMoney(totalEstimatedTax)}</p>
        </div>
      </div>

      {/* ================================================================ */}
      {/* QUARTERLY TAX ESTIMATES */}
      {/* ================================================================ */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand-gold" />
                Quarterly Tax Estimates
              </CardTitle>
              <CardDescription>
                IRS Form 1040-ES estimated payments for {year}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <label htmlFor="taxRate" className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                Income tax rate:
              </label>
              <Input
                id="taxRate"
                type="number"
                min={0}
                max={50}
                step={1}
                value={Math.round(incomeTaxRate * 100)}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 0 && val <= 50) {
                    setIncomeTaxRate(val / 100);
                  }
                }}
                className="w-16 h-8 text-sm text-center"
              />
              <span className="text-xs text-[var(--color-text-muted)]">%</span>
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 print:block">
            Effective income tax rate: {Math.round(incomeTaxRate * 100)}% | SE tax: 15.3% of 92.35% of net profit
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Quarter</th>
                  <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Revenue</th>
                  <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Expenses</th>
                  <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Net Profit</th>
                  <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">SE Tax</th>
                  <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Income Tax</th>
                  <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)] font-semibold">Est. Payment</th>
                  <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Due Date</th>
                  <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {quarterlyEstimates.map((q, i) => (
                  <tr key={q.quarter} className="border-b border-[var(--color-border-subtle)]">
                    <td className="py-3 font-medium text-[var(--color-text-primary)]">{IRS_QUARTER_LABELS[i]}</td>
                    <td className="py-3 text-right font-mono">{fmtMoney(q.revenue)}</td>
                    <td className="py-3 text-right font-mono text-[var(--color-text-secondary)]">{fmtMoney(q.expenses)}</td>
                    <td className={`py-3 text-right font-mono ${q.netProfit >= 0 ? "" : "text-red-600"}`}>{fmtMoney(q.netProfit)}</td>
                    <td className="py-3 text-right font-mono text-[var(--color-text-secondary)]">{fmtMoney(q.seTax)}</td>
                    <td className="py-3 text-right font-mono text-[var(--color-text-secondary)]">{fmtMoney(q.incomeTax)}</td>
                    <td className="py-3 text-right font-mono font-semibold text-red-600">{fmtMoney(q.totalTax)}</td>
                    <td className="py-3 text-[var(--color-text-secondary)] text-xs">{q.dueDate}</td>
                    <td className="py-3">
                      <StatusBadge
                        status={q.status === "not_due" ? "inactive" : q.status === "upcoming" ? "pending" : q.status}
                        label={q.status === "not_due" ? "Not Due" : q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--color-border)] font-semibold">
                  <td className="py-3 text-[var(--color-text-primary)]">Annual Total</td>
                  <td className="py-3 text-right font-mono">{fmtMoney(annualRevenue)}</td>
                  <td className="py-3 text-right font-mono text-[var(--color-text-secondary)]">{fmtMoney(annualExpenses)}</td>
                  <td className={`py-3 text-right font-mono ${annualNetProfit >= 0 ? "" : "text-red-600"}`}>{fmtMoney(annualNetProfit)}</td>
                  <td className="py-3 text-right font-mono text-[var(--color-text-secondary)]">{fmtMoney(annualSETax)}</td>
                  <td className="py-3 text-right font-mono text-[var(--color-text-secondary)]">{fmtMoney(annualIncomeTax)}</td>
                  <td className="py-3 text-right font-mono font-semibold text-red-600">{fmtMoney(totalEstimatedTax)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* SE Tax breakdown for print */}
          <div className="mt-4 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
            <p className="text-xs font-medium text-[var(--color-text-primary)] mb-1">Self-Employment Tax Breakdown</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[var(--color-text-secondary)]">
              <div>Net Profit: <span className="font-mono font-medium">{fmtMoney(annualNetProfit)}</span></div>
              <div>x 92.35%: <span className="font-mono font-medium">{fmtMoney(seTaxableBase)}</span></div>
              <div>x 15.3%: <span className="font-mono font-medium">{fmtMoney(annualSETax)}</span></div>
              <div>Half SE deduction: <span className="font-mono font-medium">{fmtMoney(annualSETax / 2)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* 1099-NEC TRACKER */}
      {/* ================================================================ */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-gold" />
            1099-NEC Tracker
          </CardTitle>
          <CardDescription>
            Carriers paid $600+ require 1099-NEC filing by January 31, {year + 1}
            {vendorsRequiring1099.length > 0 && (
              <> -- <span className="font-medium">{vendorsRequiring1099.length} carrier{vendorsRequiring1099.length !== 1 ? "s" : ""} require filing</span></>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No carrier payments recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Carrier</th>
                    <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">EIN</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">YTD Total Paid</th>
                    <th className="text-center py-2 text-xs font-medium text-[var(--color-text-muted)]">1099 Required</th>
                    <th className="text-center py-2 text-xs font-medium text-[var(--color-text-muted)]">W-9 Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr
                      key={v.id}
                      className={`border-b border-[var(--color-border-subtle)] ${
                        v.requires1099 && !v.w9OnFile ? "bg-red-50/50" : ""
                      }`}
                    >
                      <td className="py-2.5 font-medium text-[var(--color-text-primary)]">{v.name}</td>
                      <td className="py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">{maskEIN(v.ein)}</td>
                      <td className="py-2.5 text-right font-mono font-semibold">{fmtMoney(v.totalPaid)}</td>
                      <td className="py-2.5 text-center">
                        {v.requires1099 ? (
                          <StatusBadge status="overdue" label="Required" />
                        ) : v.totalPaid >= 400 ? (
                          <StatusBadge status="pending" label="Approaching" />
                        ) : (
                          <StatusBadge status="active" label="Below $600" />
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        {v.w9OnFile ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> On File
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertTriangle className="h-3 w-3" /> Missing
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {vendorsWithoutW9.length > 0 && (
            <div className="mt-3 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs">
              <strong>Warning:</strong> {vendorsWithoutW9.length} carrier{vendorsWithoutW9.length !== 1 ? "s" : ""} above $600 threshold without W-9 on file.
              You cannot file 1099-NEC without their EIN. Collect W-9 forms before year-end.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* REVENUE BY MATERIAL */}
      {/* ================================================================ */}
      {materials.length > 0 && (
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-gold" />
              Revenue by Material
            </CardTitle>
            <CardDescription>Categorized revenue for Schedule C reporting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 text-xs font-medium text-[var(--color-text-muted)]">Material</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">Revenue</th>
                    <th className="text-right py-2 text-xs font-medium text-[var(--color-text-muted)]">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => (
                    <tr key={m.name} className="border-b border-[var(--color-border-subtle)]">
                      <td className="py-2.5 font-medium text-[var(--color-text-primary)]">{m.name}</td>
                      <td className="py-2.5 text-right font-mono">{fmtMoney(m.revenue)}</td>
                      <td className="py-2.5 text-right font-mono text-[var(--color-text-secondary)]">
                        {annualRevenue > 0 ? ((m.revenue / annualRevenue) * 100).toFixed(1) : "0.0"}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border)] font-semibold">
                    <td className="py-2.5">Total</td>
                    <td className="py-2.5 text-right font-mono">{fmtMoney(annualRevenue)}</td>
                    <td className="py-2.5 text-right font-mono">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* TEXAS FRANCHISE TAX */}
      {/* ================================================================ */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-gold" />
            Texas Franchise Tax
          </CardTitle>
          <CardDescription>Annual filing requirement for Texas corporations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-[var(--color-border)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Annual Revenue</p>
              <p className="text-lg font-bold font-mono text-[var(--color-text-primary)]">{fmtMoney(annualRevenue)}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">No-Tax-Due Threshold</p>
              <p className="text-lg font-bold font-mono text-[var(--color-text-primary)]">$2,650,000</p>
            </div>
            <div className={`rounded-lg border p-4 ${isUnderThreshold ? "border-emerald-500/30 bg-emerald-50" : "border-amber-500/30 bg-amber-500/5"}`}>
              <p className="text-xs text-[var(--color-text-muted)]">Status</p>
              <p className={`text-lg font-bold ${isUnderThreshold ? "text-emerald-600" : "text-amber-600"}`}>
                {isUnderThreshold ? "Under Threshold" : "Tax May Apply"}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-[var(--color-text-muted)]" />
              <span className="text-[var(--color-text-secondary)]">Filing Deadline:</span>
              <span className="font-medium text-[var(--color-text-primary)]">May 15, {year}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-[var(--color-text-muted)]" />
              <span className="text-[var(--color-text-secondary)]">Required Filing:</span>
              <span className="font-medium text-[var(--color-text-primary)]">{isUnderThreshold ? "No Tax Due Report (Form 05-163)" : "Franchise Tax Report (Form 05-158-A)"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-[var(--color-text-muted)]" />
              <span className="text-[var(--color-text-secondary)]">PIR Filing:</span>
              <span className="font-medium text-[var(--color-text-primary)]">Public Information Report due with franchise tax</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* COMPLIANCE CHECKLIST */}
      {/* ================================================================ */}
      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand-gold" />
            Filing Checklist
          </CardTitle>
          <CardDescription>Tax season readiness for self-filing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <ChecklistItem checked label="Revenue tracked" description={`${fmtMoney(annualRevenue)} in invoices for ${year}`} />
            <ChecklistItem checked label="Expenses tracked" description={`${fmtMoney(annualExpenses)} in carrier settlements for ${year}`} />
            <ChecklistItem
              checked={vendorsRequiring1099.length > 0}
              label="1099-NEC identification"
              description={vendorsRequiring1099.length > 0
                ? `${vendorsRequiring1099.length} carrier${vendorsRequiring1099.length === 1 ? "" : "s"} above $600 threshold`
                : "No carriers above $600 threshold yet"
              }
            />
            <ChecklistItem
              checked={vendorsWithoutW9.length === 0}
              warning={vendorsWithoutW9.length > 0}
              label="W-9 on file for all 1099 carriers"
              description={vendorsWithoutW9.length > 0
                ? `${vendorsWithoutW9.length} carrier${vendorsWithoutW9.length === 1 ? "" : "s"} missing W-9`
                : "All 1099 carriers have W-9 on file"
              }
            />
            <ChecklistItem label="Quarterly estimates paid" description="Pay estimated taxes via IRS Direct Pay or EFTPS" checked={false} />
            <ChecklistItem label="Schedule C prepared" description="Net profit, revenue by category, and expenses ready for filing" checked />
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* PRINT STYLES */}
      {/* ================================================================ */}
      <style>{`
        @media print {
          /* Hide navigation, sidebar, and other chrome */
          nav, aside, header, footer,
          [data-sidebar], [data-topbar],
          .print\\:hidden { display: none !important; }

          /* Show print-only elements */
          .print\\:block { display: block !important; }

          /* Reset layout */
          main { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
          body { font-size: 11px !important; }

          /* Card styling for print */
          [class*="Card"] {
            break-inside: avoid;
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            margin-bottom: 12px !important;
          }

          /* Table formatting */
          table { font-size: 10px !important; }
          th, td { padding: 4px 6px !important; }

          /* Page margins */
          @page {
            margin: 0.5in;
            size: letter;
          }

          /* Ensure colors print */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChecklistItem
// ---------------------------------------------------------------------------

function ChecklistItem({
  checked,
  warning,
  label,
  description,
}: {
  checked?: boolean;
  warning?: boolean;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-2 rounded-lg">
      <div className={`flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5 ${
        warning ? "bg-amber-50 text-amber-600" :
        checked ? "bg-emerald-50 text-emerald-600" :
        "bg-zinc-500/15 text-zinc-500"
      }`}>
        {warning ? (
          <AlertTriangle className="h-3 w-3" />
        ) : checked ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <Clock className="h-3 w-3" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
      </div>
    </div>
  );
}
