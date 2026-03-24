import { Skeleton } from "@/components/ui/skeleton";

/**
 * Customer portal top-level loading state.
 */
export default function CustomerLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 animate-fade-in">
      {/* Welcome header skeleton */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-48 bg-[var(--color-surface-hover)]" />
        <Skeleton className="h-4 w-32 bg-[var(--color-surface-hover)]" />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <Skeleton className="h-4 w-20 mb-2 bg-[var(--color-surface-hover)]" />
            <Skeleton className="h-6 w-12 bg-[var(--color-surface-hover)]" />
          </div>
        ))}
      </div>

      {/* Content card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <Skeleton className="h-5 w-40 mb-4 bg-[var(--color-surface-hover)]" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full bg-[var(--color-surface-hover)]" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4 bg-[var(--color-surface-hover)]" />
                <Skeleton className="h-3 w-1/2 bg-[var(--color-surface-hover)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
