import { Skeleton } from "@/components/ui/skeleton";

/**
 * Trucker portal top-level loading state.
 * Mobile-optimized with branded warm tan colors.
 */
export default function TruckerLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      {/* Page title skeleton */}
      <Skeleton className="h-7 w-36 bg-[var(--color-surface-hover)]" />

      {/* Card skeletons — mobile-first stack */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-10 w-10 rounded-lg bg-[var(--color-surface-hover)]" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-5 w-2/3 bg-[var(--color-surface-hover)]" />
                <Skeleton className="h-3.5 w-1/2 bg-[var(--color-surface-hover)]" />
              </div>
            </div>
            <Skeleton className="h-4 w-full bg-[var(--color-surface-hover)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
