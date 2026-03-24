import type { Metadata } from "next";
import {
  getInvoicesAction,
  getCustomersForInvoiceAction,
} from "./_actions/invoices.actions";
import { InvoicesClient } from "./_components/InvoicesClient";

export const metadata: Metadata = {
  title: "Invoices",
};

export default async function InvoicesPage() {
  const [invoicesResult, customersResult] = await Promise.all([
    getInvoicesAction(),
    getCustomersForInvoiceAction(),
  ]);

  return (
    <InvoicesClient
      invoices={invoicesResult.success ? invoicesResult.data.data : []}
      customers={customersResult.success ? customersResult.data : []}
    />
  );
}
