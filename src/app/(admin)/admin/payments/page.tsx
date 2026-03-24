import type { Metadata } from "next";
import {
  getPaymentsAction,
  getSettlementPaymentsAction,
} from "./_actions/payments.actions";
import { PaymentsClient } from "./_components/PaymentsClient";

export const metadata: Metadata = {
  title: "Payments",
};

export default async function PaymentsPage() {
  const [paymentsResult, settlementsResult] = await Promise.all([
    getPaymentsAction(),
    getSettlementPaymentsAction(),
  ]);

  return (
    <PaymentsClient
      payments={paymentsResult.success ? paymentsResult.data.data : []}
      settlements={settlementsResult.success ? settlementsResult.data : []}
    />
  );
}
