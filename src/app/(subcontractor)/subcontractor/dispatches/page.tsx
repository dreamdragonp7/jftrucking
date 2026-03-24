import type { Metadata } from "next";
import { DispatchesClient } from "./_components/DispatchesClient";
import {
  getCarrierDispatches,
  getCarrierPurchaseOrders,
  getCarrierDrivers,
  getCarrierTrucks,
} from "@/app/(subcontractor)/_actions/subcontractor.actions";

export const metadata: Metadata = {
  title: "Dispatches | Subcontractor Portal | J Fudge Trucking",
};

export default async function SubcontractorDispatchesPage() {
  const [dispatchResult, posResult, driversResult, trucksResult] =
    await Promise.all([
      getCarrierDispatches({ page: 1, limit: 25 }),
      getCarrierPurchaseOrders(),
      getCarrierDrivers(),
      getCarrierTrucks(),
    ]);

  return (
    <DispatchesClient
      dispatches={dispatchResult.success ? dispatchResult.data.data : []}
      totalCount={dispatchResult.success ? dispatchResult.data.count : 0}
      purchaseOrders={posResult.success ? posResult.data : []}
      drivers={driversResult.success ? driversResult.data : []}
      trucks={trucksResult.success ? trucksResult.data : []}
    />
  );
}
