import type { Metadata } from "next";
import { getSettlementDetailsAction } from "../_actions/settlements.actions";
import { SettlementDetailClient } from "./_components/SettlementDetailClient";

export const metadata: Metadata = {
  title: "Settlement Detail",
};

export default async function SettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getSettlementDetailsAction(id);

  if (!result.success || !result.data) {
    return (
      <div className="animate-slide-up-fade">
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
          <p className="text-base font-medium text-[var(--color-text-secondary)]">
            Settlement not found
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {!result.success ? result.error : "This settlement does not exist."}
          </p>
        </div>
      </div>
    );
  }

  return <SettlementDetailClient settlement={result.data} />;
}
