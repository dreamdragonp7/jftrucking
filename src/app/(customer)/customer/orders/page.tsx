import type { Metadata } from "next";
import { OrdersClient } from "./_components/OrdersClient";
import {
  getMyOrders,
  getMySites,
  getActiveMaterials,
} from "@/app/(customer)/_actions/customer.actions";

export const metadata: Metadata = {
  title: "Orders | J Fudge Trucking",
};

export default async function CustomerOrdersPage() {
  const [ordersResult, sitesResult, materialsResult] = await Promise.all([
    getMyOrders(),
    getMySites(),
    getActiveMaterials(),
  ]);

  return (
    <OrdersClient
      orders={ordersResult.success ? ordersResult.data : []}
      sites={sitesResult.success ? sitesResult.data : []}
      materials={materialsResult.success ? materialsResult.data : []}
    />
  );
}
