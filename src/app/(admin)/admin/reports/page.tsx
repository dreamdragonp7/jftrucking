import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { loadReportsData } from "./_lib/reports.loader";
import { ReportsClient } from "./_components/ReportsClient";

export const metadata: Metadata = {
  title: "Reports",
};

export const dynamic = "force-dynamic";

async function ReportsContent() {
  const data = await loadReportsData();
  return <ReportsClient data={data} />;
}

function ReportsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-96" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div className="animate-slide-up-fade space-y-6">
      <PageHeader
        iconName="bar-chart"
        title="Reports"
        description="Revenue, margin, and performance analytics"
      />

      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsContent />
      </Suspense>
    </div>
  );
}
