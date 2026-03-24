import type { Metadata } from "next";
import { getInvoiceDetailsAction } from "../_actions/invoices.actions";
import { InvoiceDetailClient } from "./_components/InvoiceDetailClient";

export const metadata: Metadata = {
  title: "Invoice Detail",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getInvoiceDetailsAction(id);

  if (!result.success || !result.data) {
    return (
      <div className="animate-slide-up-fade">
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
          <p className="text-base font-medium text-[var(--color-text-secondary)]">
            Invoice not found
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {!result.success ? result.error : "This invoice does not exist."}
          </p>
        </div>
      </div>
    );
  }

  return <InvoiceDetailClient invoice={result.data} />;
}
