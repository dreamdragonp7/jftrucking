import type { Metadata } from "next";
import { CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "Payments",
};

export default function CustomerPaymentsPage() {
  return (
    <div className="animate-slide-up-fade">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
        Payments
      </h1>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
        <CreditCard className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
        <p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
          No payments
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          View your payment history and make payments here.
        </p>
      </div>
    </div>
  );
}
