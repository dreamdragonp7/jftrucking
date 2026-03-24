"use client";

import { cn } from "@/lib/utils/cn";

interface POProgressBarProps {
  delivered: number;
  ordered: number;
  className?: string;
  showLabel?: boolean;
}

/**
 * Progress bar for PO fulfillment — shows delivered vs ordered quantity.
 * Shared between admin and customer portals.
 * Color changes: gold (in progress) → amber (80%+) → green (complete) → red (over).
 */
export function POProgressBar({
  delivered,
  ordered,
  className,
  showLabel = true,
}: POProgressBarProps) {
  if (ordered <= 0) return null;

  const percentage = Math.round((delivered / ordered) * 100);
  const clampedWidth = Math.min(percentage, 100);

  const colorClass =
    percentage > 100
      ? "bg-red-500"
      : percentage >= 100
        ? "bg-emerald-500"
        : percentage >= 80
          ? "bg-amber-500"
          : "bg-[var(--color-brand-gold)]";

  const bgClass =
    percentage > 100
      ? "bg-red-500/15"
      : percentage >= 100
        ? "bg-emerald-500/15"
        : percentage >= 80
          ? "bg-amber-500/15"
          : "bg-[var(--color-brand-gold)]/15";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative h-3 flex-1 rounded-full overflow-hidden min-w-[60px]", bgClass)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorClass)}
          style={{ width: `${clampedWidth}%` }}
        />
      </div>
      {showLabel && (
        <span
          className={cn(
            "text-xs font-mono whitespace-nowrap",
            percentage > 100
              ? "text-red-600"
              : percentage >= 100
                ? "text-emerald-600"
                : percentage >= 80
                  ? "text-amber-600"
                  : "text-[var(--color-text-muted)]"
          )}
        >
          {percentage}%
        </span>
      )}
    </div>
  );
}
