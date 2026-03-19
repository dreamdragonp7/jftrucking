import type { Metadata } from "next";
import { Package } from "lucide-react";

export const metadata: Metadata = {
  title: "Deliveries",
};

export default function CustomerDeliveriesPage() {
  return (
    <div className="animate-slide-up-fade">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
        Deliveries
      </h1>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
        <Package className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
        <p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
          No deliveries
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          Track your active and past deliveries here.
        </p>
      </div>
    </div>
  );
}
