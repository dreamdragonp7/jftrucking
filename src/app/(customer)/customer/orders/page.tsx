import type { Metadata } from "next";
import { ShoppingCart, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Orders",
};

export default function CustomerOrdersPage() {
  return (
    <div className="animate-slide-up-fade">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          Orders
        </h1>
        <button className="inline-flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-semibold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-colors touch-target">
          <Plus className="w-4 h-4" />
          New Order
        </button>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
        <ShoppingCart className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
        <p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
          No orders yet
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          Place your first order for mason sand or cushion sand delivery.
        </p>
      </div>
    </div>
  );
}
