import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Wallet, FileText, Truck, Download } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getCarrierSettlementById } from "@/app/(subcontractor)/_actions/subcontractor.actions";

export const metadata: Metadata = {
  title: "Settlement Detail | Subcontractor Portal | J Fudge Trucking",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const e = new Date(end).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${s} - ${e}`;
}

export default async function SettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCarrierSettlementById(id);

  if (!result.success || !result.data) {
    return (
      <div className="animate-slide-up-fade">
        <Link
          href="/subcontractor/settlements"
          className="inline-flex items-center gap-1 text-sm text-brand-brown hover:text-brown-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settlements
        </Link>
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6 text-center">
          <Wallet className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--color-text-muted)]">
            Settlement not found.
          </p>
        </div>
      </div>
    );
  }

  const settlement = result.data;
  const lines = settlement.lines ?? [];

  return (
    <div className="animate-slide-up-fade">
      {/* Back link + Download */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/subcontractor/settlements"
          className="inline-flex items-center gap-1 text-sm text-brand-brown hover:text-brown-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settlements
        </Link>
        <a
          href={`/api/settlements/${id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-all duration-200"
        >
          <Download className="w-4 h-4" />
          Download Pay Stub
        </a>
      </div>

      {/* Settlement Header */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-muted)]">
              Settlement
            </p>
            <p className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
              {settlement.id.slice(0, 8)}
            </p>
          </div>
          <StatusBadge status={settlement.status} />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">Period</span>
            <span className="text-[var(--color-text-primary)] font-mono">
              {formatPeriod(settlement.period_start, settlement.period_end)}
            </span>
          </div>
          {settlement.paid_at && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">Paid</span>
              <span className="text-[var(--color-text-primary)] font-mono">
                {formatDate(settlement.paid_at)}
              </span>
            </div>
          )}
        </div>

        {/* Amounts breakdown */}
        <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">Hauling</span>
            <span className="text-[var(--color-text-primary)] font-mono">
              {formatCurrency(settlement.hauling_amount)}
            </span>
          </div>
          {settlement.dispatch_fee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">Dispatch Fee</span>
              <span className="text-emerald-600 font-mono">
                +{formatCurrency(settlement.dispatch_fee)}
              </span>
            </div>
          )}
          {settlement.deductions > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">Deductions</span>
              <span className="text-red-600 font-mono">
                -{formatCurrency(settlement.deductions)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t border-[var(--color-border)] pt-2 mt-2">
            <span className="text-[var(--color-text-primary)]">Total</span>
            <span className="text-brand-brown font-mono">
              {formatCurrency(settlement.total_amount)}
            </span>
          </div>
        </div>

        {settlement.notes && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">Notes</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {settlement.notes}
            </p>
          </div>
        )}
      </div>

      {/* Line Items */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
          Line Items
          {lines.length > 0 && (
            <span className="text-xs text-[var(--color-text-muted)] font-normal ml-2">
              ({lines.length})
            </span>
          )}
        </h2>

        {lines.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6 text-center">
            <FileText className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">
              No line items.
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {lines.map((line) => {
              const delivery = (line as unknown as Record<string, unknown>).delivery as {
                ticket_number?: string;
                delivered_at?: string;
                net_weight?: number;
                material?: { name: string } | null;
                delivery_site?: { name: string } | null;
              } | null;

              return (
                <div
                  key={line.id}
                  className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--color-text-primary)] font-mono">
                      {delivery?.ticket_number
                        ? `#${delivery.ticket_number}`
                        : `L-${line.id.slice(0, 6)}`}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-text-primary)] font-mono">
                      {formatCurrency(line.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    {delivery?.material?.name && (
                      <span>{delivery.material.name}</span>
                    )}
                    {delivery?.net_weight != null && (
                      <>
                        <span>&middot;</span>
                        <span className="font-mono">{delivery.net_weight.toFixed(1)}t</span>
                      </>
                    )}
                    {delivery?.delivered_at && (
                      <>
                        <span>&middot;</span>
                        <span className="font-mono">{formatDate(delivery.delivered_at)}</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Rate: {formatCurrency(line.rate_applied)}/unit
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
