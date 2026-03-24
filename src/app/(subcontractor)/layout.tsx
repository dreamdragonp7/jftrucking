import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { signOutAction } from "./_actions/subcontractor.actions";
import { AccountStatusGate } from "@/components/shared/AccountStatusGate";
import { SubcontractorShell } from "@/components/subcontractor/SubcontractorShell";
import * as notificationsData from "@/lib/data/notifications.data";
import type { ReactNode } from "react";

/**
 * Subcontractor portal layout -- server component that handles auth.
 *
 * 1. Checks if user is authenticated (redirects to login if not)
 * 2. Verifies user has carrier role (redirects to correct portal otherwise)
 * 3. If profile status is not "active", shows the appropriate status gate
 * 4. If active, renders the shell with tab navigation and notification count
 */
export default async function SubcontractorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userData = await getUser();

  if (!userData) {
    redirect("/subcontractor/login");
  }

  // Role guard -- subcontractor layout is only for carrier role
  if (userData.profile.role !== "carrier") {
    const dashboards: Record<string, string> = {
      admin: "/admin/dashboard",
      driver: "/trucker/loads",
      customer: "/customer/orders",
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
        portalName="subcontractor"
      />
    );
  }

  // Fetch unread notification count
  let unreadCount = 0;
  try {
    unreadCount = await notificationsData.getUnreadCount(userData.user.id);
  } catch {
    // Don't fail layout if notifications fail
  }

  return (
    <SubcontractorShell
      signOutAction={signOutAction}
      userName={userData.profile.full_name}
      companyName={userData.profile.company_name ?? undefined}
    >
      {children}
    </SubcontractorShell>
  );
}
