import type { Metadata } from "next";
import { History } from "lucide-react";

export const metadata: Metadata = {
  title: "Delivery History",
};

export default function TruckerHistoryPage() {
  return (
    <div className="animate-slide-up-fade">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
        Delivery History
      </h1>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
        <History className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
        <p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
          No deliveries yet
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          Your completed deliveries will appear here.
        </p>
      </div>
    </div>
  );
}
