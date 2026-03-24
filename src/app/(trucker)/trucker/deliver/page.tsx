import type { Metadata } from "next";
import { getDeliverableLoads } from "@/app/(trucker)/_actions/trucker.actions";
import { DeliverClient } from "./_components/DeliverClient";

export const metadata: Metadata = {
  title: "Deliver",
};

export default async function TruckerDeliverPage() {
  const result = await getDeliverableLoads();
  const loads = result.success ? result.data : [];

  return <DeliverClient initialLoads={loads} />;
}
