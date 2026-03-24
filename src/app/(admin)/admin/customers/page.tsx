import type { Metadata } from "next";
import * as customersData from "@/lib/data/customers.data";
import { CustomersClient } from "./_components/CustomersClient";

export const metadata: Metadata = {
  title: "Customers",
};

export default async function CustomersPage() {
  const { data: customers } = await customersData.getAll({ limit: 500 });

  return <CustomersClient customers={customers} />;
}
