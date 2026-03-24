import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard loading state — KPI card skeletons + chart placeholders.
 * Matches the layout of DashboardPage.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6 animate-fade-in">
      {/* KPI Cards — 2 cols on mobile, 3 cols on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
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

      {/* QBO Health Widget skeleton */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-5 w-5 rounded bg-[var(--color-surface-hover)]" />
          <Skeleton className="h-5 w-40 bg-[var(--color-surface-hover)]" />
        </div>
        <Skeleton className="h-4 w-56 bg-[var(--color-surface-hover)]" />
      </div>

      {/* Pending Actions skeleton */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6">
        <Skeleton className="h-5 w-36 mb-4 bg-[var(--color-surface-hover)]" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-10 w-40 rounded-lg bg-[var(--color-surface-hover)]"
            />
          ))}
        </div>
      </div>

      {/* Two-column layout: Recent deliveries + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Recent deliveries skeleton */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6">
          <Skeleton className="h-5 w-40 mb-4 bg-[var(--color-surface-hover)]" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-[var(--color-surface-hover)]" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4 bg-[var(--color-surface-hover)]" />
                  <Skeleton className="h-3 w-1/2 bg-[var(--color-surface-hover)]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts column skeleton */}
        <div className="flex flex-col gap-4 lg:gap-6">
          {/* Revenue chart */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-32 bg-[var(--color-surface-hover)]" />
              <Skeleton className="h-4 w-20 bg-[var(--color-surface-hover)]" />
            </div>
            <Skeleton className="h-[200px] lg:h-[240px] w-full rounded-lg bg-[var(--color-surface-hover)]" />
          </div>
          {/* AR aging chart */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-24 bg-[var(--color-surface-hover)]" />
              <Skeleton className="h-4 w-24 bg-[var(--color-surface-hover)]" />
            </div>
            <Skeleton className="h-[180px] lg:h-[200px] w-full rounded-lg bg-[var(--color-surface-hover)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
