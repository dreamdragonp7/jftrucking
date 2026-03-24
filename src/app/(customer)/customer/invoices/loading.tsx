import { Skeleton } from "@/components/ui/skeleton";

/**
 * Customer invoices page loading state — invoices list skeleton.
 */
export default function InvoicesLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 animate-fade-in">
      {/* Header */}
      <Skeleton className="h-7 w-28 bg-[var(--color-surface-hover)]" />

      {/* Invoice card skeletons */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-5 w-28 bg-[var(--color-surface-hover)]" />
              <Skeleton className="h-6 w-16 rounded-full bg-[var(--color-surface-hover)]" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 bg-[var(--color-surface-hover)]" />
              <Skeleton className="h-5 w-20 bg-[var(--color-surface-hover)]" />
            </div>
            <div className="mt-2">
              <Skeleton className="h-3.5 w-32 bg-[var(--color-surface-hover)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
