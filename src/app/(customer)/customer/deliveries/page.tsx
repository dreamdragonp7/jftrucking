import type { Metadata } from "next";
import { DeliveriesClient } from "./_components/DeliveriesClient";
import {
  getPendingDeliveries,
  getConfirmedDeliveries,
} from "@/app/(customer)/_actions/customer.actions";

export const metadata: Metadata = {
  title: "Deliveries | J Fudge Trucking",
};

export default async function CustomerDeliveriesPage() {
  const [pendingResult, confirmedResult] = await Promise.all([
    getPendingDeliveries(),
    getConfirmedDeliveries(1, 20),
  ]);

  return (
    <DeliveriesClient
      pendingDeliveries={pendingResult.success ? pendingResult.data : []}
      confirmedDeliveries={
        confirmedResult.success ? confirmedResult.data.data : []
      }
      confirmedCount={confirmedResult.success ? confirmedResult.data.count : 0}
    />
  );
}
