import type { Metadata } from "next";
import * as dispatchesData from "@/lib/data/dispatches.data";
import * as purchaseOrdersData from "@/lib/data/purchase-orders.data";
import * as driversData from "@/lib/data/drivers.data";
import * as trucksData from "@/lib/data/trucks.data";
import * as materialsData from "@/lib/data/materials.data";
import * as sitesData from "@/lib/data/sites.data";
import { createClient } from "@/lib/supabase/server";
import { DispatchClient } from "./_components/DispatchClient";
import type { DriverWithCarrier, TruckWithCarrier } from "@/types/database";

export const metadata: Metadata = {
  title: "Dispatch",
};

interface DispatchPageProps {
  searchParams: Promise<{ date?: string; tab?: string }>;
}

export default async function DispatchPage({ searchParams }: DispatchPageProps) {
  const params = await searchParams;
  const currentDate =
    params.date ?? new Date().toISOString().split("T")[0];
  const initialTab = params.tab === "deliveries" ? "deliveries" : "board";

  const [
    dispatches,
    { data: purchaseOrders },
    { data: drivers },
    { data: trucks },
    { data: materials },
    { data: sites },
    deliveries,
  ] = await Promise.all([
    dispatchesData.getForDate(currentDate),
    purchaseOrdersData.getAll({ status: "active", limit: 500 }),
    driversData.getAll({ status: "active", limit: 500 }),
    trucksData.getAll({ status: "active", limit: 500 }),
    materialsData.getAll({ status: "active" }),
    sitesData.getAll({ limit: 500, status: "active" }),
    fetchDeliveries(),
  ]);

  return (
    <DispatchClient
      dispatches={dispatches}
      purchaseOrders={purchaseOrders}
      drivers={drivers as DriverWithCarrier[]}
      trucks={trucks as TruckWithCarrier[]}
      materials={materials}
      sites={sites}
      currentDate={currentDate}
      deliveries={deliveries}
      initialTab={initialTab}
    />
  );
}

// ---------------------------------------------------------------------------
// Fetch deliveries for the "Deliveries" tab
// ---------------------------------------------------------------------------

async function fetchDeliveries() {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("deliveries")
    .select(`
      *,
      driver:drivers(name),
      truck:trucks(number),
      material:materials(name),
      delivery_site:sites(name),
      dispatch:dispatches(
        scheduled_date,
        carrier:carriers(name),
        purchase_order:purchase_orders(
          po_number,
          customer:customers(name)
        )
      )
    `)
    .order("delivered_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[dispatch/deliveries] Failed to fetch:", error);
    return [];
  }

  return data ?? [];
}
