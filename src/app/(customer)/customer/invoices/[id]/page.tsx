import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Download } from "lucide-react";
import { getInvoiceById } from "@/app/(customer)/_actions/customer.actions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "Invoice Detail | J Fudge Trucking",
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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getInvoiceById(id);

  if (!result.success || !result.data) {
    return (
      <div className="animate-slide-up-fade">
        <Link
          href="/customer/invoices"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
          <p className="text-base font-medium text-[var(--color-text-secondary)]">
            Invoice not found
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {!result.success ? result.error : "This invoice does not exist or you don't have access."}
          </p>
        </div>
      </div>
    );
  }

  const invoice = result.data;
  const isUnpaid = invoice.status === "sent";
  const overdue =
    !["paid", "cancelled"].includes(invoice.status) &&
    new Date(invoice.due_date) < new Date();

  return (
    <div className="animate-slide-up-fade max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/customer/invoices"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Invoices
      </Link>

      {/* Invoice card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[var(--color-border)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] font-mono">
                {invoice.invoice_number}
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                {formatDate(invoice.period_start)} &mdash;{" "}
                {formatDate(invoice.period_end)}
              </p>
            </div>
            <StatusBadge status={overdue ? "overdue" : invoice.status} label={overdue ? "Overdue" : undefined} />
          </div>

          {/* Company info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                From
              </p>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                J Fudge Trucking Inc
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Aggregate Hauling
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Bill To
              </p>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {invoice.customer?.name ?? "Customer"}
              </p>
              {invoice.customer?.billing_address && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  {invoice.customer.billing_address}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2 text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-medium">
                  Description
                </th>
                <th className="text-right py-2 text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-medium w-16">
                  Qty
                </th>
                <th className="text-right py-2 text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-medium w-24">
                  Rate
                </th>
                <th className="text-right py-2 text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-medium w-28">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items && invoice.line_items.length > 0 ? (
                invoice.line_items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[var(--color-border)]/50"
                  >
                    <td className="py-3 text-[var(--color-text-primary)]">
                      {item.description}
                    </td>
                    <td className="py-3 text-right text-[var(--color-text-secondary)] font-mono">
                      {item.quantity}
                    </td>
                    <td className="py-3 text-right text-[var(--color-text-secondary)] font-mono">
                      {formatMoney(item.rate)}
                    </td>
                    <td className="py-3 text-right text-[var(--color-text-primary)] font-mono font-medium">
                      {formatMoney(item.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-center text-[var(--color-text-muted)]"
                  >
                    No line items
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[var(--color-text-muted)]">Subtotal</span>
              <span className="font-mono text-[var(--color-text-secondary)]">
                {formatMoney(invoice.subtotal)}
              </span>
            </div>
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--color-text-muted)]">Tax</span>
                <span className="font-mono text-[var(--color-text-secondary)]">
                  {formatMoney(invoice.tax_amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-[var(--color-border)]">
              <span className="text-[var(--color-text-primary)]">Total</span>
              <span className="font-mono text-[var(--color-text-primary)]">
                {formatMoney(invoice.total)}
              </span>
            </div>
          </div>

          {/* Due date */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Due Date</span>
            <span
              className={cn(
                "font-mono font-medium",
                overdue
                  ? "text-red-600"
                  : "text-[var(--color-text-secondary)]"
              )}
            >
              {formatDate(invoice.due_date)}
            </span>
          </div>

          {invoice.status === "paid" && invoice.paid_at && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Paid On</span>
              <span className="font-mono font-medium text-emerald-600">
                {formatDate(invoice.paid_at)}
              </span>
            </div>
          )}

          {/* Tax note */}
          <p className="mt-4 text-[10px] text-[var(--color-text-muted)] text-center italic">
            Hauling services are not subject to Texas sales tax per Texas Tax Code
            Chapter 151. This invoice reflects transportation/hauling services only.
          </p>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Notes
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-[var(--color-border)] bg-surface-deep flex gap-3">
          {isUnpaid && (
            invoice.qb_payment_link ? (
              <a
                href={invoice.qb_payment_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors bg-brand-gold text-[var(--color-text-on-gold)] hover:bg-gold-400"
              >
                <ExternalLink className="w-4 h-4" />
                Pay Now
              </a>
            ) : (
              <div className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-surface-deep text-[var(--color-text-muted)] border border-[var(--color-border)]">
                <ExternalLink className="w-4 h-4" />
                Payment link coming soon
              </div>
            )
          )}
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-surface-hover transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}
