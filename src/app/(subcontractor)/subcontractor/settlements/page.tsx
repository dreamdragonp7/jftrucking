import type { Metadata } from "next";
import { SettlementsClient } from "./_components/SettlementsClient";
import { getCarrierSettlements } from "@/app/(subcontractor)/_actions/subcontractor.actions";

export const metadata: Metadata = {
  title: "Settlements | Subcontractor Portal | J Fudge Trucking",
};

export default async function SubcontractorSettlementsPage() {
  const result = await getCarrierSettlements({ page: 1, limit: 25 });

  return (
    <SettlementsClient
      settlements={result.success ? result.data.data : []}
      totalCount={result.success ? result.data.count : 0}
    />
  );
}
