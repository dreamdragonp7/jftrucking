"use server";

import { signOut } from "@/lib/supabase/auth";

/**
 * Server action to sign out the current user.
 * Used by admin layout components to avoid importing server-only code in client components.
 */
export async function signOutAction() {
  await signOut();
}
