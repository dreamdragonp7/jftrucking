import type { Metadata } from "next";
import { getMyLoads } from "@/app/(trucker)/_actions/trucker.actions";
import { LoadsClient } from "./_components/LoadsClient";

export const metadata: Metadata = {
  title: "My Loads",
};

export default async function TruckerLoadsPage() {
  const result = await getMyLoads();
  const loads = result.success ? result.data : [];

  return <LoadsClient initialLoads={loads} />;
}
