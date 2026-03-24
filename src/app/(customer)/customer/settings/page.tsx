import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/auth";
import {
  getMyCustomerProfile,
  getCustomerAddresses,
} from "@/app/(customer)/_actions/customer.actions";
import { SettingsClient } from "./_components/SettingsClient";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Settings | J Fudge Trucking",
};

export default async function CustomerSettingsPage() {
  const userData = await getUser();
  if (!userData) redirect("/customer/login");

  const [customerResult, addressResult] = await Promise.all([
    getMyCustomerProfile(),
    getCustomerAddresses(),
  ]);

  return (
    <SettingsClient
      profile={userData.profile}
      customer={customerResult.success ? customerResult.data : null}
      initialAddresses={addressResult.success ? addressResult.data : []}
    />
  );
}
