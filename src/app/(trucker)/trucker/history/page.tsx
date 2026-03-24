import type { Metadata } from "next";
import { getMyHistory } from "@/app/(trucker)/_actions/trucker.actions";
import { HistoryClient } from "./_components/HistoryClient";

export const metadata: Metadata = {
  title: "Delivery History",
};

export default async function TruckerHistoryPage() {
  // Default to last 30 days
  const result = await getMyHistory({ days: 30 });
  const deliveries = result.success ? result.data : [];

  return <HistoryClient initialDeliveries={deliveries} />;
}
