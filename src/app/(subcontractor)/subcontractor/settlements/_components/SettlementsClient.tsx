"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Wallet,
  ChevronRight,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { getCarrierSettlements } from "@/app/(subcontractor)/_actions/subcontractor.actions";
import type { CarrierSettlement } from "@/types/database";

interface SettlementsClientProps {
  settlements: CarrierSettlement[];
  totalCount: number;
}

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

export function SettlementsClient({
  settlements: initialSettlements,
  totalCount: initialCount,
}: SettlementsClientProps) {
  const [settlements, setSettlements] = useState(initialSettlements);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    const nextPage = page + 1;
    startTransition(async () => {
      const result = await getCarrierSettlements({ page: nextPage, limit: 25 });
      if (result.success) {
        setSettlements((prev) => [...prev, ...result.data.data]);
        setTotalCount(result.data.count);
        setPage(nextPage);
      }
    });
  }

  return (
    <div className="animate-slide-up-fade">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
        Settlements
      </h1>

      {settlements.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6 text-center">
          <Wallet className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--color-text-muted)]">
            No settlements yet.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            {settlements.map((settlement) => (
              <Link
                key={settlement.id}
                href={`/subcontractor/settlements/${settlement.id}`}
                className="rounded-xl border border-[var(--color-border)] bg-surface px-4 py-3 flex items-center gap-3 hover:border-[var(--color-border-strong)] hover:shadow-sm transition-all"
              >
                <Wallet className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--color-text-primary)] font-mono">
                      {formatCurrency(settlement.total_amount)}
                    </span>
                    <StatusBadge status={settlement.status} />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {formatPeriod(settlement.period_start, settlement.period_end)}
                  </p>
                  {settlement.paid_at && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Paid {formatDate(settlement.paid_at)}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
              </Link>
            ))}
          </div>

          {/* Load More */}
          {settlements.length < totalCount && (
            <div className="mt-4 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isPending}
                className="text-sm text-brand-brown hover:text-brown-400 font-medium transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    Loading...
                  </span>
                ) : (
                  `Load more (${totalCount - settlements.length} remaining)`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
