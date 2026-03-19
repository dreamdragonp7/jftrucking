import type { Metadata } from "next";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Invoices",
};

export default function CustomerInvoicesPage() {
  return (
    <div className="animate-slide-up-fade">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
        Invoices
      </h1>

      <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
        <FileText className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
        <p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
          No invoices
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          Your invoices from J Fudge Trucking will appear here.
        </p>
      </div>
    </div>
  );
}
