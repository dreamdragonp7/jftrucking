import type { Metadata } from "next";
import { DashboardClient } from "./_components/DashboardClient";
import { getCarrierDashboard } from "@/app/(subcontractor)/_actions/subcontractor.actions";

export const metadata: Metadata = {
  title: "Dashboard | Subcontractor Portal | J Fudge Trucking",
};

export default async function SubcontractorDashboardPage() {
  const result = await getCarrierDashboard();

  return (
    <DashboardClient
      data={
        result.success
          ? result.data
          : {
              carrierName: "Your Company",
              deliveriesThisMonth: 0,
              pendingSettlements: 0,
              pendingSettlementAmount: 0,
              totalEarnedYtd: 0,
              recentDeliveries: [],
            }
      }
    />
  );
}
