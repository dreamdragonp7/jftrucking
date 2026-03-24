"use client";

import Link from "next/link";
import {
  FileText,
  ExternalLink,
  Download,
  Eye,
  AlertCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils/cn";
import type { Invoice } from "@/types/database";

// Extended styles for invoice statuses
const INVOICE_STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  draft: { dot: "bg-zinc-400", label: "Draft" },
  sent: { dot: "bg-amber-400", label: "Unpaid" },
  paid: { dot: "bg-emerald-400", label: "Paid" },
  overdue: { dot: "bg-red-500", label: "Overdue" },
  cancelled: { dot: "bg-zinc-400", label: "Cancelled" },
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(invoice: Invoice): boolean {
  if (["paid", "cancelled"].includes(invoice.status)) return false;
  return new Date(invoice.due_date) < new Date();
}

export function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  // Sort: overdue first, then unpaid, then paid
  const sorted = [...invoices].sort((a, b) => {
    const priority = (inv: Invoice) => {
      if (isOverdue(inv)) return 0;
      if (inv.status === "sent") return 1;
      if (inv.status === "paid") return 3;
      return 2;
    };
    return priority(a) - priority(b);
  });

  return (
    <div className="animate-slide-up-fade">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
        Invoices
      </h1>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
          <FileText className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
            No invoices
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Your invoices from J Fudge Trucking will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sorted.map((invoice) => {
            const overdue = isOverdue(invoice);
            const displayStatus = overdue ? "overdue" : invoice.status;
            const statusInfo =
              INVOICE_STATUS_STYLES[displayStatus] ??
              INVOICE_STATUS_STYLES.draft;
            const isUnpaid = invoice.status === "sent" || overdue;

            return (
              <div
                key={invoice.id}
                className={cn(
                  "rounded-xl border bg-surface p-4 transition-colors",
                  overdue
                    ? "border-red-500/30"
                    : "border-[var(--color-border)] hover:border-[var(--color-brand-gold)]/30"
                )}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text-primary)] font-mono">
                      {invoice.invoice_number}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Due: {formatDate(invoice.due_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        statusInfo.dot
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wide",
                        overdue
                          ? "text-red-600"
                          : invoice.status === "paid"
                            ? "text-emerald-600"
                            : "text-amber-600"
                      )}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Period */}
                <p className="text-xs text-[var(--color-text-muted)] mb-2">
                  Period: {formatDate(invoice.period_start)} &mdash;{" "}
                  {formatDate(invoice.period_end)}
                </p>

                {/* Amount */}
                <p className="text-lg font-bold font-mono text-[var(--color-text-primary)] mb-3">
                  {formatMoney(invoice.total)}
                </p>

                {/* Overdue warning */}
                {overdue && (
                  <div className="flex items-center gap-2 mb-3 rounded-lg bg-red-50 px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="text-xs text-red-600">
                      This invoice is past due
                    </span>
                  </div>
                )}

                {/* Paid date */}
                {invoice.status === "paid" && invoice.paid_at && (
                  <p className="text-xs text-emerald-600 mb-3">
                    Paid on {formatDate(invoice.paid_at)}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {isUnpaid && (
                    <a
                      href={invoice.qb_payment_link ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                        invoice.qb_payment_link
                          ? "bg-brand-gold text-[var(--color-text-on-gold)] hover:bg-gold-400"
                          : "bg-brand-gold/50 text-[var(--color-text-on-gold)]/70 cursor-not-allowed"
                      )}
                      onClick={(e) => {
                        if (!invoice.qb_payment_link) e.preventDefault();
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Pay Now
                    </a>
                  )}
                  <Link
                    href={`/customer/invoices/${invoice.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-surface-hover transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Link>
                  <a
                    href={`/api/invoices/${invoice.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-surface-hover transition-colors"
                    aria-label="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
