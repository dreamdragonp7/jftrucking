import type { Metadata } from "next";
import * as purchaseOrdersData from "@/lib/data/purchase-orders.data";
import * as customersData from "@/lib/data/customers.data";
import * as materialsData from "@/lib/data/materials.data";
import * as sitesData from "@/lib/data/sites.data";
import { PurchaseOrdersClient } from "./_components/PurchaseOrdersClient";

export const metadata: Metadata = {
  title: "Purchase Orders",
};

export default async function PurchaseOrdersPage() {
  const [
    { data: purchaseOrders },
    { data: customers },
    { data: materials },
    { data: sites },
  ] = await Promise.all([
    purchaseOrdersData.getAll({ limit: 500 }),
    customersData.getAll({ limit: 500 }),
    materialsData.getAll({ status: "active" }),
    sitesData.getAll({ limit: 500, status: "active" }),
  ]);

  return (
    <PurchaseOrdersClient
      purchaseOrders={purchaseOrders}
      customers={customers}
      materials={materials}
      sites={sites}
    />
  );
}
