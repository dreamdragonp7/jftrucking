"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Package,
  Scale,
  FileText,
} from "lucide-react";

import type { DeliveryWithRelations } from "@/types/database";
import { getMyHistory } from "@/app/(trucker)/_actions/trucker.actions";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Status styles
// ---------------------------------------------------------------------------

const CONFIRMATION_STYLES: Record<
  string,
  { icon: typeof CheckCircle; color: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: "text-[var(--color-warning)] bg-[var(--color-warning-muted)]",
    label: "Pending",
  },
  confirmed: {
    icon: CheckCircle,
    color: "text-[var(--color-success)] bg-[var(--color-success-muted)]",
    label: "Confirmed",
  },
  disputed: {
    icon: AlertTriangle,
    color: "text-[var(--color-danger)] bg-[var(--color-danger-muted)]",
    label: "Disputed",
  },
};

// ---------------------------------------------------------------------------
// Date filter options
// ---------------------------------------------------------------------------

const DATE_FILTERS = [
  { label: "7 Days", value: 7 },
  { label: "30 Days", value: 30 },
  { label: "90 Days", value: 90 },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface HistoryClientProps {
  initialDeliveries: DeliveryWithRelations[];
}

export function HistoryClient({ initialDeliveries }: HistoryClientProps) {
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [activeDays, setActiveDays] = useState(30);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleFilterChange = (days: number) => {
    setActiveDays(days);
    startTransition(async () => {
      const result = await getMyHistory({
        days,
        ticket_number: searchQuery || undefined,
      });
      if (result.success) {
        setDeliveries(result.data);
      }
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2 || query.length === 0) {
      startTransition(async () => {
        const result = await getMyHistory({
          days: activeDays,
          ticket_number: query || undefined,
        });
        if (result.success) {
          setDeliveries(result.data);
        }
      });
    }
  };

  // Format the delivery date nicely
  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <div className="animate-slide-up-fade">
      <h1 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
        Delivery History
      </h1>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
        <input
          type="search"
          inputMode="search"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by ticket #"
          className={cn(
            "w-full h-12 pl-10 pr-4 rounded-xl border border-[var(--color-border)] bg-surface",
            "text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
            "focus:border-gold-300 focus:ring-2 focus:ring-gold-300/30 outline-none transition-all"
          )}
        />
      </div>

      {/* Date filter tabs */}
      <div className="flex gap-2 mb-4">
        {DATE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => handleFilterChange(filter.value)}
            disabled={isPending}
            className={cn(
              "flex-1 h-10 rounded-lg text-sm font-medium transition-colors touch-target",
              activeDays === filter.value
                ? "bg-brand-gold/10 text-brand-brown border border-brand-gold/30"
                : "bg-surface text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-surface-hover"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-brand-gold/30 border-t-gold-300 rounded-full animate-spin" />
        </div>
      )}

      {/* Delivery list */}
      {!isPending && deliveries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center"
        >
          <Clock className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
            No deliveries yet
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Your completed deliveries will appear here.
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-2">
          {deliveries.map((delivery, index) => {
            const status =
              CONFIRMATION_STYLES[delivery.confirmation_status] ??
              CONFIRMATION_STYLES.pending;
            const StatusIcon = status.icon;

            // Try to get material name from the delivery's dispatch join
            const materialName =
              delivery.material?.name ??
              (delivery.dispatch as DispatchWithMaterial)?.material?.name ??
              "Material";
            const siteName =
              delivery.delivery_site?.name ??
              "Delivery Site";

            return (
              <motion.div
                key={delivery.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.25 }}
                className="rounded-xl border border-[var(--color-border)] bg-surface p-3"
              >
                {/* Top row: date + status */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[var(--color-text-muted)] font-mono">
                    {formatDate(delivery.delivered_at)}{" "}
                    {formatTime(delivery.delivered_at)}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                      status.color
                    )}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>

                {/* Material + site */}
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-brand-brown flex-shrink-0" />
                  <span className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2">
                    {materialName}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] ml-6 mb-2 line-clamp-2">
                  {siteName}
                </p>

                {/* Details row: ticket + weight */}
                <div className="flex items-center gap-4 ml-6">
                  {delivery.ticket_number && (
                    <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                      <FileText className="w-3 h-3 text-[var(--color-text-muted)]" />
                      <span className="font-mono">
                        #{delivery.ticket_number}
                      </span>
                    </div>
                  )}
                  {delivery.net_weight != null && (
                    <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                      <Scale className="w-3 h-3 text-[var(--color-text-muted)]" />
                      <span className="font-mono">
                        {delivery.net_weight} tons
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Type helper for the nested dispatch join
interface DispatchWithMaterial {
  material?: { name: string } | null;
  pickup_site?: { name: string } | null;
  delivery_site?: { name: string } | null;
}
