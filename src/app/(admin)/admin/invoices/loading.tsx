import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/shared/SkeletonPresets";

/**
 * Invoices page loading state — table skeleton.
 */
export default function InvoicesLoading() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28 bg-[var(--color-surface-hover)]" />
        <Skeleton className="h-9 w-32 rounded-lg bg-[var(--color-surface-hover)]" />
      </div>

      {/* Search bar */}
      <Skeleton className="h-10 w-full max-w-sm rounded-lg bg-[var(--color-surface-hover)]" />

      {/* Table skeleton */}
      <SkeletonTable rows={8} columns={6} />
    </div>
  );
}
