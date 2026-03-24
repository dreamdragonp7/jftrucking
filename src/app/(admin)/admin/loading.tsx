import { Skeleton } from "@/components/ui/skeleton";

/**
 * Admin portal top-level loading state.
 * Shows sidebar skeleton + content area skeleton.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 animate-fade-in">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 bg-[var(--color-surface-hover)]" />
        <Skeleton className="h-9 w-28 rounded-lg bg-[var(--color-surface-hover)]" />
      </div>

      {/* Content area skeleton */}
      <div className="grid gap-4 lg:gap-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <Skeleton className="h-4 w-20 mb-2 bg-[var(--color-surface-hover)]" />
              <Skeleton className="h-7 w-16 bg-[var(--color-surface-hover)]" />
            </div>
          ))}
        </div>

        {/* Main content card skeleton */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6">
          <Skeleton className="h-5 w-32 mb-4 bg-[var(--color-surface-hover)]" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-12 w-full rounded-lg bg-[var(--color-surface-hover)]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
