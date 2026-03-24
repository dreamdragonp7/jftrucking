import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { signOutAction } from "./_actions/customer.actions";
import { AccountStatusGate } from "@/components/shared/AccountStatusGate";
import { CustomerShell } from "@/components/customer/CustomerShell";
import type { ReactNode } from "react";

/**
 * Customer portal layout — server component that handles auth.
 *
 * 1. Checks if user is authenticated (redirects to login if not)
 * 2. Verifies user has customer role (redirects to correct portal otherwise)
 * 3. If profile status is not "active", shows the appropriate status gate
 * 4. If active, renders the shell with tab navigation and notification count
 */
export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userData = await getUser();

  if (!userData) {
    redirect("/customer/login");
  }

  // Role guard — customer layout is only for customer role
  if (userData.profile.role !== "customer") {
    const dashboards: Record<string, string> = {
      admin: "/admin/dashboard",
      driver: "/trucker/loads",
      carrier: "/subcontractor/dashboard",
    };
    redirect(dashboards[userData.profile.role] ?? "/");
  }

  // Gate: non-active statuses
  if (userData.profile.status !== "active") {
    return (
      <AccountStatusGate
        status={userData.profile.status}
        statusReason={userData.profile.status_reason}
        signOutAction={signOutAction}
        portalName="customer"
      />
    );
  }


  return (
    <CustomerShell
      signOutAction={signOutAction}
      userName={userData.profile.full_name}
      companyName={userData.profile.company_name ?? undefined}
    >
      {children}
    </CustomerShell>
  );
}
