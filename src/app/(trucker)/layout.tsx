import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { signOutAction } from "./_actions/trucker.actions";
import { AccountStatusGate } from "@/components/shared/AccountStatusGate";
import { TruckerShell } from "@/components/trucker/TruckerShell";
import type { ReactNode } from "react";

/**
 * Trucker portal layout — server component that handles auth.
 *
 * 1. Checks if user is authenticated (redirects to login if not)
 * 2. If profile status is not "active", shows the appropriate status gate
 * 3. If active, renders the mobile-first shell with bottom nav
 */
export default async function TruckerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userData = await getUser();

  if (!userData) {
    redirect("/trucker/login");
  }

  // Role guard — trucker layout is only for driver role
  if (userData.profile.role !== "driver") {
    redirect("/trucker/login");
  }

  // Gate: non-active statuses
  if (userData.profile.status !== "active") {
    return (
      <AccountStatusGate
        status={userData.profile.status}
        statusReason={userData.profile.status_reason}
        signOutAction={signOutAction}
        portalName="trucker"
      />
    );
  }

  return (
    <TruckerShell signOutAction={signOutAction}>
      {children}
    </TruckerShell>
  );
}
