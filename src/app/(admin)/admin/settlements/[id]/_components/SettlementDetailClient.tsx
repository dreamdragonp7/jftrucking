"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  CheckCircle,
  CreditCard,
  Trash2,
  Wallet,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusTimeline } from "@/components/admin/StatusTimeline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { JFT_COMPANY } from "@/lib/constants/company";
import type { SettlementWithFullDetails } from "@/lib/services/settlement.service";
import {
  approveSettlementAction,
  paySettlementAction,
  deleteSettlementAction,
} from "../../_actions/settlements.actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "\u2014";
  return new Date(
    dateStr.includes("T") ? dateStr : dateStr + "T00:00:00"
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SettlementDetailClientProps {
  settlement: SettlementWithFullDetails;
}

export function SettlementDetailClient({
  settlement,
}: SettlementDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const carrier = settlement.carrier as any;
  const lines = settlement.lines ?? [];

  // Sort lines by delivery date
  const sortedLines = [...lines].sort((a, b) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateA = (a.delivery as any)?.delivered_at ?? "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dateB = (b.delivery as any)?.delivered_at ?? "";
    return dateA.localeCompare(dateB);
  });

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveSettlementAction(settlement.id);
      if (result.success) {
        toast.success("Settlement approved");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handlePay = () => {
    startTransition(async () => {
      const result = await paySettlementAction(settlement.id);
      if (result.success) {
        toast.success("Settlement payment initiated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteSettlementAction(settlement.id);
      if (result.success) {
        toast.success("Settlement deleted");
        router.push("/admin/settlements");
      } else {
        toast.error(result.error);
      }
    });
  };

  // Timeline steps
  const timelineSteps = [
    {
      status: "draft",
      label: "Draft",
      timestamp: settlement.created_at,
    },
    {
      status: "approved",
      label: "Approved",
      timestamp: settlement.approved_at,
    },
    {
      status: "paid",
      label: "Paid",
      timestamp: settlement.paid_at,
    },
  ];

  return (
    <div className="animate-slide-up-fade max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/admin/settlements"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settlements
      </Link>

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              Settlement {settlement.id.slice(0, 8).toUpperCase()}
            </h1>
            <StatusBadge status={settlement.status} />
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {carrier?.name ?? "Carrier"} &bull;{" "}
            {formatDate(settlement.period_start)} &ndash;{" "}
            {formatDate(settlement.period_end)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/api/settlements/${settlement.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </a>
          </Button>
          {settlement.status === "draft" && (
            <>
              <Button size="sm" onClick={handleApprove} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-300"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </>
          )}
          {settlement.status === "approved" && (
            <>
              <Button size="sm" onClick={handlePay} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-1" />
                )}
                Pay Now
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/api/settlements/${settlement.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </a>
              </Button>
            </>
          )}
          {settlement.status === "paid" && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/api/settlements/${settlement.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4 mr-1" />
                Download PDF
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4 mb-6">
        <StatusTimeline
          steps={timelineSteps}
          currentStatus={settlement.status}
          orientation="horizontal"
        />
      </div>

      {/* Settlement card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[var(--color-border)]">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-brown-700 flex items-center justify-center text-[var(--color-text-on-brown)]">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">
                    {JFT_COMPANY.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Settlement Statement
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[var(--color-brand-brown)] tracking-wider mb-3">
                SETTLEMENT
              </p>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[var(--color-text-muted)]">#:</span>
                  <span className="font-mono font-bold text-[var(--color-text-primary)]">
                    {settlement.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[var(--color-text-muted)]">
                    Period:
                  </span>
                  <span className="font-mono text-[var(--color-text-secondary)]">
                    {formatDate(settlement.period_start)} &ndash;{" "}
                    {formatDate(settlement.period_end)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pay To */}
          <div className="pt-4 border-t border-[var(--color-border)]">
            <p className="text-[10px] text-[var(--color-brand-brown)] uppercase tracking-widest font-bold mb-2">
              Pay To
            </p>
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              {carrier?.name ?? "Carrier"}
            </p>
            {carrier?.contact_name && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Attn: {carrier.contact_name}
              </p>
            )}
            {carrier?.address && (
              <p className="text-xs text-[var(--color-text-muted)]">
                {carrier.address}
              </p>
            )}
            {carrier?.email && (
              <p className="text-xs text-[var(--color-text-muted)]">
                {carrier.email}
              </p>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                  Date
                </th>
                <th className="text-left py-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                  Ticket #
                </th>
                <th className="text-left py-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
                  Material
                </th>
                <th className="text-right py-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold w-20">
                  Weight
                </th>
                <th className="text-right py-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold w-24">
                  Rate
                </th>
                <th className="text-right py-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold w-28">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLines.length > 0 ? (
                sortedLines.map((line) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const delivery = line.delivery as any;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const material = delivery?.material as any;
                  return (
                    <tr
                      key={line.id}
                      className="border-b border-[var(--color-border)]/50"
                    >
                      <td className="py-3 text-sm text-[var(--color-text-secondary)]">
                        {delivery?.delivered_at
                          ? formatDate(delivery.delivered_at.split("T")[0])
                          : "\u2014"}
                      </td>
                      <td className="py-3 font-mono text-sm text-[var(--color-text-secondary)]">
                        {delivery?.ticket_number ?? "\u2014"}
                      </td>
                      <td className="py-3 text-sm text-[var(--color-text-primary)]">
                        {material?.name ?? "Unknown"}
                      </td>
                      <td className="py-3 text-right font-mono text-[var(--color-text-secondary)]">
                        {(delivery?.net_weight ?? 0).toLocaleString("en-US", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 text-right font-mono text-[var(--color-text-secondary)]">
                        {formatMoney(line.rate_applied)}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-[var(--color-text-primary)]">
                        {formatMoney(line.amount)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-[var(--color-text-muted)]"
                  >
                    No line items
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">
                  Hauling Subtotal ({sortedLines.length} deliveries)
                </span>
                <span className="font-mono text-[var(--color-text-secondary)]">
                  {formatMoney(settlement.hauling_amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">
                  Dispatch Fee
                </span>
                <span className="font-mono text-[var(--color-text-secondary)]">
                  {formatMoney(settlement.dispatch_fee)}
                </span>
              </div>
              {settlement.deductions > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">
                    Deductions
                  </span>
                  <span className="font-mono text-red-600">
                    ({formatMoney(settlement.deductions)})
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-[var(--color-border)]">
                <span className="text-[var(--color-text-primary)]">
                  Total Due
                </span>
                <span className="font-mono text-[var(--color-brand-gold)]">
                  {formatMoney(settlement.total_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment info */}
          <div className="mt-6 rounded-lg border-l-4 border-l-[var(--color-brand-gold)] bg-surface-deep p-4">
            <p className="text-[10px] text-[var(--color-brand-brown)] uppercase tracking-widest font-bold mb-2">
              Payment Information
            </p>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[var(--color-text-muted)]">Method:</span>
                <span className="ml-1 font-medium text-[var(--color-text-secondary)]">
                  ACH Direct Deposit
                </span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">Status:</span>
                <span className="ml-1 font-medium text-[var(--color-text-secondary)]">
                  {settlement.status === "paid"
                    ? "Paid"
                    : settlement.status === "approved"
                      ? "Approved"
                      : "Draft"}
                </span>
              </div>
              {settlement.paid_at && (
                <div>
                  <span className="text-[var(--color-text-muted)]">
                    Paid On:
                  </span>
                  <span className="ml-1 font-medium font-mono text-emerald-600">
                    {formatDate(settlement.paid_at)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] bg-surface-deep text-center">
          <p className="text-xs text-[var(--color-text-muted)]">
            {JFT_COMPANY.name} &bull; {JFT_COMPANY.phone} &bull;{" "}
            {JFT_COMPANY.email}
          </p>
        </div>
      </div>
    </div>
  );
}
