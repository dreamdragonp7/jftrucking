/**
 * Demo data helper -- returns mock data when Supabase is not configured.
 *
 * PRODUCTION SAFETY: Only returns demo data when NEXT_PUBLIC_SUPABASE_URL
 * is not set. When Supabase is configured, this module returns null for
 * everything, and the real data layer takes over.
 */

import type { Profile, UserRole } from "@/types/database";

export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/**
 * Returns a fake user object for the given role.
 * Only returns data in demo mode.
 */
export async function getDemoUser(
  role: UserRole
): Promise<{ user: { id: string; email: string }; profile: Profile } | null> {
  if (!isDemoMode()) return null;

  const { DEMO_PROFILES, IDS } = await import("./data");

  const roleToProfile: Record<UserRole, { profileId: string; email: string }> =
    {
      admin: {
        profileId: IDS.adminProfile,
        email: "admin@demo.jft",
      },
      customer: {
        profileId: IDS.customerProfile,
        email: "customer@demo.jft",
      },
      driver: {
        profileId: IDS.driverProfile1,
        email: "driver@demo.jft",
      },
      carrier: {
        profileId: IDS.carrierProfile,
        email: "carrier@demo.jft",
      },
    };

  const mapping = roleToProfile[role];
  if (!mapping) return null;

  const profile = DEMO_PROFILES.find((p) => p.id === mapping.profileId);
  if (!profile) return null;

  return {
    user: { id: profile.id, email: mapping.email },
    profile,
  };
}
