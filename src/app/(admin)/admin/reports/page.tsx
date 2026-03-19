import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Reports",
};

export default function ReportsPage() {
  return (
    <div className="animate-slide-up-fade">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brown-700 text-gold-300">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Reports
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Revenue, volume, and performance analytics
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6">
        <p className="text-sm text-[var(--color-text-muted)]">
          Reports interface loading...
        </p>
      </div>
    </div>
  );
}
