import type { Metadata } from "next";
import { notFound } from "next/navigation";
import * as dispatchesData from "@/lib/data/dispatches.data";
import * as deliveriesData from "@/lib/data/deliveries.data";
import { DispatchDetailClient } from "./DispatchDetailClient";

export const metadata: Metadata = {
  title: "Dispatch Detail",
};

interface DispatchDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DispatchDetailPage({
  params,
}: DispatchDetailPageProps) {
  const { id } = await params;
  const dispatch = await dispatchesData.getById(id);

  if (!dispatch) {
    notFound();
  }

  // Get delivery data for this dispatch
  const { data: deliveries } = await deliveriesData.getAll({
    dispatch_id: id,
    limit: 10,
  });

  const delivery = deliveries.length > 0 ? deliveries[0] : null;

  return (
    <DispatchDetailClient dispatch={dispatch} delivery={delivery} />
  );
}
