"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Truck,
  CalendarDays,
  DollarSign,
  FileText,
  TrendingUp,
  Wallet,
  Package,
} from "lucide-react";
import type { ComponentType } from "react";

/** Icon name strings that can be safely serialized across the Server/Client boundary. */
export type KpiIconName =
  | "truck"
  | "calendar"
  | "dollar"
  | "file"
  | "trending"
  | "wallet"
  | "package";

const ICON_MAP: Record<KpiIconName, ComponentType<{ className?: string }>> = {
  truck: Truck,
  calendar: CalendarDays,
  dollar: DollarSign,
  file: FileText,
  trending: TrendingUp,
  wallet: Wallet,
  package: Package,
};

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number; // percent change — positive is up
  iconName: KpiIconName;
  isCurrency?: boolean;
  index?: number; // for stagger animation delay
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  iconName,
  isCurrency = false,
  index = 0,
}: KpiCardProps) {
  const Icon = ICON_MAP[iconName] ?? Package;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-secondary)] truncate">
            {title}
          </p>
          <p
            className={cn(
              "mt-2 text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)] tracking-tight",
              (isCurrency || /^\d/.test(value)) && "font-mono"
            )}
          >
            {value}
          </p>
          {(subtitle || trend !== undefined) && (
            <div className="mt-1 flex items-center gap-2">
              {trend !== undefined && trend !== 0 && (
                <span
                  className={cn(
                    "text-xs font-medium font-mono",
                    trend > 0
                      ? "text-[var(--color-success)]"
                      : "text-[var(--color-danger)]"
                  )}
                >
                  {trend > 0 ? "+" : ""}
                  {trend}%
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-[var(--color-text-muted)] truncate">
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brown-700 text-[var(--color-text-on-brown)] flex-shrink-0 ml-3">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton version for loading state
// ---------------------------------------------------------------------------

export function KpiCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-24 bg-[var(--color-surface-hover)]" />
          <Skeleton className="h-8 w-20 mt-2 bg-[var(--color-surface-hover)]" />
          <Skeleton className="h-3 w-16 mt-2 bg-[var(--color-surface-hover)]" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg bg-[var(--color-surface-hover)]" />
      </div>
    </motion.div>
  );
}
