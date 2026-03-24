import type { Metadata } from "next";
import * as sitesData from "@/lib/data/sites.data";
import * as customersData from "@/lib/data/customers.data";
import { SitesClient } from "./_components/SitesClient";

export const metadata: Metadata = {
  title: "Sites",
};

export default async function SitesPage() {
  const [sitesResult, customersResult] = await Promise.all([
    sitesData.getAll({ limit: 500 }),
    customersData.getAll({ status: "active", limit: 500 }),
  ]);

  const customers = customersResult.data.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <SitesClient sites={sitesResult.data} customers={customers} />
  );
}
