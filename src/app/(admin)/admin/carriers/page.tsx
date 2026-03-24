import type { Metadata } from "next";
import * as carriersData from "@/lib/data/carriers.data";
import { CarriersClient } from "./_components/CarriersClient";

export const metadata: Metadata = {
  title: "Carriers",
};

export default async function CarriersPage() {
  const { data: carriers } = await carriersData.getAll({ limit: 500 });

  return <CarriersClient carriers={carriers} />;
}
