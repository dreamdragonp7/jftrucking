import type { Metadata } from "next";
import * as ratesData from "@/lib/data/rates.data";
import * as customersData from "@/lib/data/customers.data";
import * as carriersData from "@/lib/data/carriers.data";
import * as materialsData from "@/lib/data/materials.data";
import * as sitesData from "@/lib/data/sites.data";
import { RatesClient } from "./_components/RatesClient";

export const metadata: Metadata = {
  title: "Rates",
};

export default async function RatesPage() {
  const [ratesResult, customersResult, carriersResult, materialsResult, sitesResult] =
    await Promise.all([
      ratesData.getAll({ limit: 500 }),
      customersData.getAll({ status: "active", limit: 500 }),
      carriersData.getAll({ status: "active", limit: 500 }),
      materialsData.getAll({ status: "active" }),
      sitesData.getAll({ status: "active", limit: 500 }),
    ]);

  return (
    <RatesClient
      rates={ratesResult.data}
      customers={customersResult.data.map((c) => ({ id: c.id, name: c.name }))}
      carriers={carriersResult.data.map((c) => ({ id: c.id, name: c.name }))}
      materials={materialsResult.data.map((m) => ({ id: m.id, name: m.name }))}
      sites={sitesResult.data.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
