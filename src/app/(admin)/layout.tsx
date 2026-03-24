import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { AdminShellClient } from "@/components/admin/AdminShellClient";
import type { ReactNode } from "react";

/**
 * Admin portal layout — server component that handles auth.
 *
 * 1. Checks if user is authenticated (redirects to login if not)
 * 2. Verifies user has admin role (redirects to correct portal otherwise)
 * 3. If authenticated as admin, renders the client-side admin shell
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userData = await getUser();

  if (!userData) {
    redirect("/admin/login");
  }

  // Role guard — admin layout is only for admin role
  if (userData.profile.role !== "admin") {
    const dashboards: Record<string, string> = {
      driver: "/trucker/loads",
      customer: "/customer/orders",
      carrier: "/subcontractor/dashboard",
    };
    redirect(dashboards[userData.profile.role] ?? "/");
  }

  return <AdminShellClient>{children}</AdminShellClient>;
}
