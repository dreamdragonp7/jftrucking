"use client";

import Link from "next/link";
import {
  Truck,
  Wallet,
  DollarSign,
  Package,
  ArrowRight,
} from "lucide-react";
import type { CarrierDashboardData } from "@/app/(subcontractor)/_actions/subcontractor.actions";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface DashboardClientProps {
  data: CarrierDashboardData;
}

export function DashboardClient({ data }: DashboardClientProps) {
  return (
    <div className="animate-slide-up-fade">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          {data.carrierName}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          Subcontractor Dashboard
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Deliveries This Month */}
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
              Deliveries
            </span>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] font-mono">
            {data.deliveriesThisMonth}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            This month
          </p>
        </div>

        {/* Pending Settlements */}
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
              Pending
            </span>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] font-mono">
            {data.pendingSettlements}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {formatCurrency(data.pendingSettlementAmount)}
          </p>
        </div>

        {/* Total Earned YTD */}
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-4 col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
              Total Earned YTD
            </span>
          </div>
          <p className="text-3xl font-bold text-brand-brown font-mono">
            {formatCurrency(data.totalEarnedYtd)}
          </p>
        </div>
      </div>

      {/* Recent Deliveries */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Recent Deliveries
          </h2>
          <Link
            href="/subcontractor/dispatches"
            className="flex items-center gap-1 text-sm text-brand-brown hover:text-brown-400 transition-colors"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {data.recentDeliveries.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6 text-center">
            <Package className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">
              No recent deliveries.
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {data.recentDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-3 flex items-center gap-3"
              >
                <Truck className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--color-text-primary)] truncate">
                      {delivery.material?.name ?? "Material"}
                    </span>
                    {delivery.net_weight != null && (
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">
                        {delivery.net_weight.toFixed(1)}t
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {delivery.driver?.name ?? "Driver"}
                    </p>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      &middot;
                    </span>
                    <p className="text-xs text-[var(--color-text-muted)] font-mono">
                      {formatDate(delivery.delivered_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
