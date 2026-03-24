import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonList } from "@/components/shared/SkeletonPresets";

/**
 * Dispatch board loading state.
 * Matches the DispatchClient layout with date picker + dispatch cards.
 */
export default function DispatchLoading() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6 animate-fade-in">
      {/* Header: title + date picker + add button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-32 bg-[var(--color-surface-hover)]" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg bg-[var(--color-surface-hover)]" />
          <Skeleton className="h-9 w-36 rounded-lg bg-[var(--color-surface-hover)]" />
          <Skeleton className="h-9 w-9 rounded-lg bg-[var(--color-surface-hover)]" />
          <Skeleton className="h-9 w-28 rounded-lg bg-[var(--color-surface-hover)]" />
        </div>
      </div>

      {/* Dispatch card skeletons */}
      <SkeletonList count={6} showAvatar={false} />
    </div>
  );
}
