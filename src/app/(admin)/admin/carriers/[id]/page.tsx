import type { Metadata } from "next";
import { notFound } from "next/navigation";
import * as carriersData from "@/lib/data/carriers.data";
import * as driversData from "@/lib/data/drivers.data";
import * as trucksData from "@/lib/data/trucks.data";
import { CarrierDetailClient } from "./_components/CarrierDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const carrier = await carriersData.getById(id);
  return {
    title: carrier?.name ?? "Carrier Details",
  };
}

export default async function CarrierDetailPage({ params }: Props) {
  const { id } = await params;
  const carrier = await carriersData.getById(id);

  if (!carrier) notFound();

  const [driversResult, trucksResult] = await Promise.all([
    driversData.getAll({ carrier_id: id, limit: 500 }),
    trucksData.getAll({ carrier_id: id, limit: 500 }),
  ]);

  return (
    <CarrierDetailClient
      carrier={carrier}
      drivers={driversResult.data}
      trucks={trucksResult.data}
    />
  );
}
