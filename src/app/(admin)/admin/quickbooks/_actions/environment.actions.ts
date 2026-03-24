"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type { QbEnvironment } from "@/types/database";

// ---------------------------------------------------------------------------
// Get current QB environment + summary
// ---------------------------------------------------------------------------

export async function getQBEnvironmentAction(): Promise<
  ActionResult<{
    current: QbEnvironment;
    sandbox: { customers: number; carriers: number; invoices: number; payments: number; settlements: number };
    production: { customers: number; carriers: number; invoices: number; payments: number; settlements: number };
  }>
> {
  try {
    await requireRole("admin");

    const { getEnvironmentSummary } = await import(
      "@/lib/integrations/quickbooks/environment"
    );
    const summary = await getEnvironmentSummary();

    return ok(summary);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Switch QB environment
// ---------------------------------------------------------------------------

export async function switchQBEnvironmentAction(
  targetEnv: QbEnvironment
): Promise<ActionResult<{ cleared: number }>> {
  try {
    const auth = await requireRole("admin");

    if (targetEnv !== "sandbox" && targetEnv !== "production") {
      return fail("Invalid environment. Must be 'sandbox' or 'production'.");
    }

    const { switchEnvironment } = await import(
      "@/lib/integrations/quickbooks/environment"
    );
    const result = await switchEnvironment(targetEnv, auth.user.id);

    if (!result.success) {
      return fail(result.error ?? "Failed to switch environment");
    }

    revalidatePath("/admin/quickbooks");
    return ok({ cleared: result.cleared });
  } catch (error) {
    return fail(error);
  }
}
