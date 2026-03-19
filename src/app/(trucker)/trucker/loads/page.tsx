import type { Metadata } from "next";
import { Package, MapPin, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "My Loads",
};

export default function TruckerLoadsPage() {
  return (
    <div className="animate-slide-up-fade">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
        My Loads
      </h1>

      {/* Empty state */}
      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
        <Package className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
        <p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
          No loads assigned
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          You&apos;ll see your assigned loads here when dispatch sends them.
        </p>
      </div>

      {/* Sample load card structure */}
      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-surface p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="inline-flex items-center rounded-full bg-gold-300/10 px-2.5 py-0.5 text-xs font-medium text-gold-300">
              Pending
            </span>
            <p className="text-base font-semibold text-[var(--color-text-primary)] mt-1">
              Mason Sand &middot; 20 tons
            </p>
          </div>
          <span className="text-sm text-[var(--color-text-muted)] font-mono">
            #LD-001
          </span>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <MapPin className="w-4 h-4 flex-shrink-0 text-[var(--color-text-muted)]" />
            <span>Pickup: Austin Sand Pit, FM 2222</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <MapPin className="w-4 h-4 flex-shrink-0 text-gold-300" />
            <span>Drop: Mueller Development, Lot 4</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>Due by 3:00 PM today</span>
          </div>
        </div>

        <button className="w-full mt-4 rounded-lg bg-brand-gold px-4 py-3.5 text-base font-semibold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-colors touch-target-large">
          Start Delivery
        </button>
      </div>
    </div>
  );
}
