"use client";

import { CreditCard, FileText, Download } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { PaymentWithRelations } from "@/types/database";

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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ach: "ACH",
  check: "Check",
  wire: "Wire",
  other: "Other",
};

export function PaymentsClient({
  payments,
}: {
  payments: PaymentWithRelations[];
}) {
  return (
    <div className="animate-slide-up-fade">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
        Payments
      </h1>

      {payments.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
          <CreditCard className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
            No payments yet
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Your payment history will appear here after you pay an invoice.
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:border-[var(--color-brand-gold)]/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--color-text-muted)]" />
                  <span className="text-sm font-mono text-[var(--color-text-primary)]">
                    {payment.invoice?.invoice_number ?? "—"}
                  </span>
                </div>
                <StatusBadge status={payment.status} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
                    {formatMoney(payment.amount)}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] font-mono">
                    {payment.paid_at
                      ? formatDate(payment.paid_at)
                      : payment.created_at
                        ? formatDate(payment.created_at)
                        : "—"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={payment.payment_method}
                    label={PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method}
                  />
                  <button
                    className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-text-muted)] hover:bg-surface-hover transition-colors"
                    aria-label="Download receipt"
                    title="Receipt download coming soon"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {payment.failure_reason && (
                <div className="mt-2 rounded-lg bg-red-50 px-3 py-2">
                  <p className="text-xs text-red-600">
                    Failed: {payment.failure_reason}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
