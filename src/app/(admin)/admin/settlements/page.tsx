import type { Metadata } from "next";
import {
  getSettlementsAction,
  getCarriersForSettlementAction,
} from "./_actions/settlements.actions";
import { SettlementsClient } from "./_components/SettlementsClient";

export const metadata: Metadata = {
  title: "Carrier Settlements",
};

export default async function SettlementsPage() {
  const [settlementsResult, carriersResult] = await Promise.all([
    getSettlementsAction(),
    getCarriersForSettlementAction(),
  ]);

  return (
    <SettlementsClient
      settlements={
        settlementsResult.success ? settlementsResult.data.data : []
      }
      carriers={carriersResult.success ? carriersResult.data : []}
    />
  );
}
