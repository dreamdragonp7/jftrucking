import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonList } from "@/components/shared/SkeletonPresets";

/**
 * Trucker loads loading state — load card skeletons.
 * Matches the LoadsClient layout (mobile card list).
 */
export default function LoadsLoading() {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28 bg-[var(--color-surface-hover)]" />
        <Skeleton className="h-6 w-16 rounded-full bg-[var(--color-surface-hover)]" />
      </div>

      {/* Load card skeletons */}
      <SkeletonList count={4} showAvatar={false} />
    </div>
  );
}
