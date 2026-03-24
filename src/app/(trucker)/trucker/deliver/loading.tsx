import { Skeleton } from "@/components/ui/skeleton";

/**
 * Delivery form loading state.
 * Matches the DeliverClient layout (load selection + form).
 */
export default function DeliverLoading() {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <Skeleton className="h-7 w-36 bg-[var(--color-surface-hover)]" />

      {/* Load selector skeleton */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <Skeleton className="h-5 w-28 mb-3 bg-[var(--color-surface-hover)]" />
        <Skeleton className="h-10 w-full rounded-lg bg-[var(--color-surface-hover)]" />
      </div>

      {/* Delivery form skeleton */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-4">
        {/* Ticket number */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 bg-[var(--color-surface-hover)]" />
          <Skeleton className="h-10 w-full rounded-lg bg-[var(--color-surface-hover)]" />
        </div>
        {/* Net weight */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 bg-[var(--color-surface-hover)]" />
          <Skeleton className="h-10 w-full rounded-lg bg-[var(--color-surface-hover)]" />
        </div>
        {/* Photo upload area */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 bg-[var(--color-surface-hover)]" />
          <Skeleton className="h-32 w-full rounded-lg bg-[var(--color-surface-hover)]" />
        </div>
        {/* Notes */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 bg-[var(--color-surface-hover)]" />
          <Skeleton className="h-20 w-full rounded-lg bg-[var(--color-surface-hover)]" />
        </div>
        {/* Submit button */}
        <Skeleton className="h-14 w-full rounded-lg bg-[var(--color-surface-hover)]" />
      </div>
    </div>
  );
}
