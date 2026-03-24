import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getDisputes } from "./_actions/disputes.actions";
import { DisputesClient } from "./_components/DisputesClient";

export const metadata: Metadata = {
  title: "Disputes",
};

export const dynamic = "force-dynamic";

async function DisputesContent() {
  const [openResult, resolvedResult] = await Promise.all([
    getDisputes("open"),
    getDisputes("resolved"),
  ]);

  const openDisputes = openResult.success ? openResult.data : [];
  const resolvedDisputes = resolvedResult.success ? resolvedResult.data : [];

  return (
    <DisputesClient
      openDisputes={openDisputes}
      resolvedDisputes={resolvedDisputes}
    />
  );
}

function DisputesSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-48" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function DisputesPage() {
  return (
    <div className="animate-slide-up-fade space-y-6">
      <PageHeader
        iconName="alert-triangle"
        title="Disputes"
        description="Review and resolve delivery disputes"
      />

      <Suspense fallback={<DisputesSkeleton />}>
        <DisputesContent />
      </Suspense>
    </div>
  );
}
