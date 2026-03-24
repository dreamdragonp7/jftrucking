"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import * as profilesData from "@/lib/data/profiles.data";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type { Profile, UserRole, ProfileStatus, AppSetting } from "@/types/database";

/**
 * Get all users for the user management section.
 */
export async function getUsers(): Promise<ActionResult<Profile[]>> {
  try {
    await requireRole("admin");
    const { data } = await profilesData.getAll({ limit: 100 });
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}

/**
 * Update a user's status (approve, suspend, reactivate).
 */
export async function updateUserStatus(
  userId: string,
  status: ProfileStatus
): Promise<ActionResult<void>> {
  try {
    await requireRole("admin");
    await profilesData.update(userId, { status });
    revalidatePath("/admin/settings");
    return ok(undefined);
  } catch (e) {
    return fail(e);
  }
}

/**
 * Update a user's role.
 */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<ActionResult<void>> {
  try {
    const auth = await requireRole("admin");

    // Prevent admins from changing their own role
    if (userId === auth.user.id) {
      return fail("You cannot change your own role.");
    }

    await profilesData.update(userId, { role });

    // Sync role to BOTH app_metadata and user_metadata in Supabase Auth
    const supabase = createAdminClient();
    if (supabase) {
      await supabase.auth.admin.updateUserById(userId, {
        app_metadata: { role },
        user_metadata: { role },
      });
    }

    revalidatePath("/admin/settings");
    return ok(undefined);
  } catch (e) {
    return fail(e);
  }
}

/**
 * Create a new user via admin.
 */
export async function createUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  phone?: string;
}): Promise<ActionResult<void>> {
  try {
    await requireRole("admin");

    const supabase = createAdminClient();
    if (!supabase) return fail("Supabase admin client not configured");

    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        role: input.role,
        full_name: input.fullName,
        phone: input.phone,
      },
    });

    if (error) return fail(error.message);

    // The profile should be auto-created by the database trigger,
    // but let's ensure the status is active since admin created it
    if (data.user) {
      try {
        await profilesData.update(data.user.id, { status: "active" });
      } catch (profileErr) {
        console.warn("[Settings] Profile update after user creation failed (trigger may not have fired yet):", profileErr instanceof Error ? profileErr.message : profileErr);
      }
    }

    revalidatePath("/admin/settings");
    return ok(undefined);
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Account Lifecycle: Suspend / Reactivate / Deactivate
// ---------------------------------------------------------------------------

/**
 * Reactivate an inactive user account.
 */
export async function reactivateUserAction(
  userId: string
): Promise<ActionResult<void>> {
  try {
    const auth = await requireRole("admin");

    await profilesData.update(userId, {
      status: "active",
      status_reason: null,
      status_changed_at: new Date().toISOString(),
      status_changed_by: auth.user.id,
    });

    // Unban the user in Supabase Auth
    const supabase = createAdminClient();
    if (supabase) {
      await supabase.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
    }

    revalidatePath("/admin/settings");
    return ok(undefined);
  } catch (e) {
    return fail(e);
  }
}

/**
 * Deactivate a user account (sets status to inactive). All data preserved.
 */
export async function deactivateUserAction(
  userId: string,
  reason: string
): Promise<ActionResult<void>> {
  try {
    const auth = await requireRole("admin");

    await profilesData.update(userId, {
      status: "inactive",
      status_reason: reason,
      status_changed_at: new Date().toISOString(),
      status_changed_by: auth.user.id,
    });

    // Sign the user out
    const supabase = createAdminClient();
    if (supabase) {
      await supabase.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });
    }

    revalidatePath("/admin/settings");
    return ok(undefined);
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Business Settings (app_settings)
// ---------------------------------------------------------------------------

/**
 * Update multiple business settings at once.
 */
export async function updateBusinessSettings(
  settings: Record<string, string>
): Promise<ActionResult<void>> {
  try {
    await requireRole("admin");

    const supabase = createAdminClient();
    if (!supabase) return fail("Supabase admin client not configured");

    // Upsert each setting
    for (const [key, value] of Object.entries(settings)) {
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      if (error) {
        return fail(`Failed to update setting "${key}": ${error.message}`);
      }
    }

    revalidatePath("/admin/settings");
    return ok(undefined);
  } catch (e) {
    return fail(e);
  }
}

/**
 * Get all business settings for the settings page.
 */
export async function getBusinessSettingsAction(): Promise<ActionResult<AppSetting[]>> {
  try {
    await requireRole("admin");

    const supabase = createAdminClient();
    if (!supabase) return fail("Supabase admin client not configured");

    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .order("key");

    if (error) return fail(error.message);
    return ok((data ?? []) as AppSetting[]);
  } catch (e) {
    return fail(e);
  }
}

