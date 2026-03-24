import type { Metadata } from "next";
import { PaymentsClient } from "./_components/PaymentsClient";
import { getMyPayments } from "@/app/(customer)/_actions/customer.actions";

export const metadata: Metadata = {
  title: "Payments | J Fudge Trucking",
};

export default async function CustomerPaymentsPage() {
  const result = await getMyPayments();

  return (
    <PaymentsClient payments={result.success ? result.data : []} />
  );
}
