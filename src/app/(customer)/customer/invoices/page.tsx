import type { Metadata } from "next";
import { InvoicesClient } from "./_components/InvoicesClient";
import { getMyInvoices } from "@/app/(customer)/_actions/customer.actions";

export const metadata: Metadata = {
  title: "Invoices | J Fudge Trucking",
};

export default async function CustomerInvoicesPage() {
  const result = await getMyInvoices();

  return (
    <InvoicesClient invoices={result.success ? result.data : []} />
  );
}
