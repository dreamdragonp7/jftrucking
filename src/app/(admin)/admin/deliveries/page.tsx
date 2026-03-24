import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { DeliveriesClient } from "./_components/DeliveriesClient";

export const metadata: Metadata = {
  title: "Deliveries",
};

export const dynamic = "force-dynamic";

async function DeliveriesContent() {
  const supabase = await createClient();
  if (!supabase) return <DeliveriesClient deliveries={[]} />;

  const { data, error } = await supabase
    .from("deliveries")
    .select(`
      *,
      driver:drivers(name),
      truck:trucks(number),
      material:materials(name),
      delivery_site:sites(name),
      dispatch:dispatches(
        scheduled_date,
        carrier:carriers(name),
        purchase_order:purchase_orders(
          po_number,
          customer:customers(name)
        )
      )
    `)
    .order("delivered_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[deliveries] Failed to fetch:", error);
    return <DeliveriesClient deliveries={[]} />;
  }

  return <DeliveriesClient deliveries={data ?? []} />;
}

function DeliveriesSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-64" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function DeliveriesPage() {
  return (
    <div className="animate-slide-up-fade space-y-6">
      <PageHeader
        iconName="truck"
        title="Deliveries"
        description="Track all deliveries and confirmation status"
      />

      <Suspense fallback={<DeliveriesSkeleton />}>
        <DeliveriesContent />
      </Suspense>
    </div>
  );
}
