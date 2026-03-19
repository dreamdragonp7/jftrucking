import type { Metadata } from "next";
import { Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "Carriers",
};

export default function CarriersPage() {
  return (
    <div className="animate-slide-up-fade">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brown-700 text-gold-300">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Carriers
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage carrier profiles and capacity
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6">
        <p className="text-sm text-[var(--color-text-muted)]">
          Carriers interface loading...
        </p>
      </div>
    </div>
  );
}
