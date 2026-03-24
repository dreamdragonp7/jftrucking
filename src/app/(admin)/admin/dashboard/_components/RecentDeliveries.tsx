"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, Clock, XCircle, ChevronRight, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils/cn";
import type { RecentDelivery } from "../_lib/dashboard.loader";

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  RecentDelivery["status"],
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
  }
> = {
  confirmed: {
    icon: CheckCircle,
    label: "Confirmed",
    color: "text-[var(--color-success)]",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-brand-brown",
  },
  disputed: {
    icon: XCircle,
    label: "Disputed",
    color: "text-[var(--color-danger)]",
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentDeliveriesProps {
  deliveries: RecentDelivery[];
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecentDeliveries({ deliveries, isLoading }: RecentDeliveriesProps) {
  if (isLoading) {
    return <RecentDeliveriesSkeleton />;
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
      <div className="flex items-center justify-between px-4 lg:px-6 pt-4 lg:pt-5 pb-3">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          Recent Deliveries
        </h2>
        <Link
          href="/admin/deliveries"
          className="text-xs font-medium text-brand-brown hover:text-brown-400 transition-colors flex items-center gap-1"
        >
          View All
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {deliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] mb-3">
            <Truck className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            No deliveries yet
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Deliveries will appear here once dispatched
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-[380px]">
          <div className="px-4 lg:px-6 pb-4 lg:pb-5">
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {deliveries.map((delivery, i) => {
                const statusCfg = STATUS_CONFIG[delivery.status] ?? STATUS_CONFIG.pending;
                const StatusIcon = statusCfg.icon;

                return (
                  <motion.div
                    key={delivery.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    {/* Status icon */}
                    <div className={cn("flex-shrink-0", statusCfg.color)}>
                      <StatusIcon className="h-4 w-4" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium font-mono text-[var(--color-text-primary)] truncate">
                          {delivery.deliveryNumber}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] truncate hidden sm:inline">
                          {delivery.material}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {delivery.weight && (
                          <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                            {delivery.weight.toLocaleString()} {delivery.unit}
                          </span>
                        )}
                        {delivery.driverName && (
                          <span className="text-xs text-[var(--color-text-muted)] truncate">
                            {delivery.driverName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <span className="text-xs font-mono text-[var(--color-text-muted)] flex-shrink-0">
                      {formatRelativeTime(delivery.deliveredAt)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function RecentDeliveriesSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-36 bg-[var(--color-surface-hover)]" />
        <Skeleton className="h-4 w-16 bg-[var(--color-surface-hover)]" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded-full bg-[var(--color-surface-hover)]" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 bg-[var(--color-surface-hover)]" />
              <Skeleton className="h-3 w-24 mt-1 bg-[var(--color-surface-hover)]" />
            </div>
            <Skeleton className="h-3 w-12 bg-[var(--color-surface-hover)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
