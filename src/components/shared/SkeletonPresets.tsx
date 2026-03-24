import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// SkeletonCard — KPI cards, load cards, dashboard widgets
// ---------------------------------------------------------------------------

interface SkeletonCardProps {
  /** Number of cards to render (default: 4) */
  count?: number;
  /** Grid columns on mobile (default: 1) */
  cols?: 1 | 2;
  /** Grid columns on desktop (default: cols) */
  lgCols?: 1 | 2 | 3 | 4;
  className?: string;
}

export function SkeletonCard({
  count = 4,
  cols = 1,
  lgCols,
  className,
}: SkeletonCardProps) {
  const gridClass = cn(
    "grid gap-3 lg:gap-4",
    cols === 1 ? "grid-cols-1" : "grid-cols-2",
    lgCols === 2 && "lg:grid-cols-2",
    lgCols === 3 && "lg:grid-cols-3",
    lgCols === 4 && "lg:grid-cols-4",
    className
  );

  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-8 w-8 rounded-lg bg-[var(--color-surface-hover)]" />
            <Skeleton className="h-4 w-20 bg-[var(--color-surface-hover)]" />
          </div>
          <Skeleton className="h-7 w-24 mb-1 bg-[var(--color-surface-hover)]" />
          <Skeleton className="h-3 w-16 bg-[var(--color-surface-hover)]" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkeletonTable — data table loading states
// ---------------------------------------------------------------------------

interface SkeletonTableProps {
  /** Number of rows (default: 6) */
  rows?: number;
  /** Number of columns (default: 5) */
  columns?: number;
  /** Show header row (default: true) */
  showHeader?: boolean;
  className?: string;
}

export function SkeletonTable({
  rows = 6,
  columns = 5,
  showHeader = true,
  className,
}: SkeletonTableProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden",
        className
      )}
    >
      {showHeader && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
          <div className="flex items-center gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-4 bg-[var(--color-surface-hover)]"
                style={{ width: `${60 + ((i * 37) % 60)}px` }}
              />
            ))}
          </div>
        </div>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="border-b border-[var(--color-border)] px-4 py-3 last:border-b-0"
        >
          <div className="flex items-center gap-4">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton
                key={j}
                className="h-5 bg-[var(--color-surface-hover)]"
                style={{ width: `${40 + ((j * 37 + i * 13) % 80)}px` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkeletonList — list/feed loading states (e.g., trucker load cards)
// ---------------------------------------------------------------------------

interface SkeletonListProps {
  /** Number of items (default: 4) */
  count?: number;
  /** Show icon/avatar on each row (default: true) */
  showAvatar?: boolean;
  className?: string;
}

export function SkeletonList({
  count = 4,
  showAvatar = true,
  className,
}: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <div className="flex items-start gap-3">
            {showAvatar && (
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0 bg-[var(--color-surface-hover)]" />
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32 bg-[var(--color-surface-hover)]" />
                <Skeleton className="h-5 w-16 rounded-full bg-[var(--color-surface-hover)]" />
              </div>
              <Skeleton className="h-4 w-3/4 bg-[var(--color-surface-hover)]" />
              <Skeleton className="h-3 w-1/2 bg-[var(--color-surface-hover)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
