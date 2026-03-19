import type { Metadata } from "next";
import { MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Job Sites",
};

export default function JobSitesPage() {
  return (
    <div className="animate-slide-up-fade">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brown-700 text-gold-300">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Job Sites
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Delivery locations and site details
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6">
        <p className="text-sm text-[var(--color-text-muted)]">
          Job Sites interface loading...
        </p>
      </div>
    </div>
  );
}
