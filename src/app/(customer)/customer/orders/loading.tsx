import { Skeleton } from "@/components/ui/skeleton";

/**
 * Customer orders page loading state — orders table skeleton.
 */
export default function OrdersLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 animate-fade-in">
      {/* Header + new order button */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24 bg-[var(--color-surface-hover)]" />
        <Skeleton className="h-9 w-28 rounded-lg bg-[var(--color-surface-hover)]" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        {/* Table header */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3">
          <div className="flex items-center gap-4">
            {[100, 80, 120, 80, 80].map((w, i) => (
              <Skeleton
                key={i}
                className="h-4 bg-[var(--color-surface-hover)]"
                style={{ width: `${w}px` }}
              />
            ))}
          </div>
        </div>
        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-[var(--color-border)] px-4 py-3"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-24 bg-[var(--color-surface-hover)]" />
              <Skeleton className="h-5 w-20 bg-[var(--color-surface-hover)]" />
              <Skeleton className="h-5 w-32 bg-[var(--color-surface-hover)]" />
              <Skeleton className="h-5 w-20 bg-[var(--color-surface-hover)]" />
              <Skeleton className="h-6 w-20 rounded-full bg-[var(--color-surface-hover)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
