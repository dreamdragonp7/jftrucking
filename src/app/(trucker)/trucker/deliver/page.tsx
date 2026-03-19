import type { Metadata } from "next";
import { Camera, MapPin, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Deliver",
};

export default function TruckerDeliverPage() {
  return (
    <div className="animate-slide-up-fade">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
        Confirm Delivery
      </h1>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6 text-center">
        <Camera className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
        <p className="text-base font-medium text-[var(--color-text-secondary)] mb-2">
          No active delivery
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Start a delivery from My Loads to confirm it here with GPS and photo
          proof.
        </p>

        <div className="flex flex-col gap-3 text-left">
          <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <MapPin className="w-5 h-5 flex-shrink-0" />
            <span>GPS location captured automatically</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <Camera className="w-5 h-5 flex-shrink-0" />
            <span>Take a photo of the delivered material</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>Customer gets notified instantly</span>
          </div>
        </div>
      </div>
    </div>
  );
}
