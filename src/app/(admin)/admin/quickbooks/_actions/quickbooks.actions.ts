"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";

// ---------------------------------------------------------------------------
// Get connection status
// ---------------------------------------------------------------------------

export async function getQBConnectionStatusAction(): Promise<
  ActionResult<{
    connected: boolean;
    companyName: string | null;
    environment: string;
    connectedAt: string | null;
    lastSyncTime: string | null;
    tokenExpiresAt: string | null;
    refreshTokenExpiresAt: string | null;
    isConfigured: boolean;
  }>
> {
  try {
    await requireRole("admin");

    const { isQBConfigured } = await import(
      "@/lib/integrations/quickbooks"
    );
    const { getConnectionStatus } = await import(
      "@/lib/services/quickbooks.service"
    );

    const status = await getConnectionStatus();

    return ok({
      ...status,
      isConfigured: isQBConfigured(),
    });
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Get OAuth URL
// ---------------------------------------------------------------------------

export async function getQBAuthUrlAction(): Promise<
  ActionResult<{ url: string; state: string }>
> {
  try {
    await requireRole("admin");

    const { getAuthorizationUrl } = await import(
      "@/lib/integrations/quickbooks"
    );
    const result = await getAuthorizationUrl();

    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Disconnect
// ---------------------------------------------------------------------------

export async function disconnectQBAction(): Promise<ActionResult<void>> {
  try {
    await requireRole("admin");

    const { deleteTokens } = await import(
      "@/lib/integrations/quickbooks"
    );
    await deleteTokens();

    revalidatePath("/admin/quickbooks");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Setup: Create Customer in QBO
// ---------------------------------------------------------------------------

export async function createQBCustomerAction(
  customerId: string
): Promise<ActionResult<{ qbId: string }>> {
  try {
    await requireRole("admin");

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    if (!supabase) return fail("Supabase not configured");

    const { data: customer, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (error || !customer) return fail("Customer not found");

    const { createOrUpdateCustomer } = await import(
      "@/lib/services/quickbooks.service"
    );
    const result = await createOrUpdateCustomer({
      id: customer.id,
      name: customer.name,
      billing_email: customer.billing_email,
      billing_address: customer.billing_address,
      phone: customer.phone,
    });

    if (!result.success) return fail(result.error ?? "Failed to create customer");

    revalidatePath("/admin/quickbooks");
    return ok({ qbId: result.qbId! });
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Setup: Create Vendor in QBO
// ---------------------------------------------------------------------------

export async function createQBVendorAction(
  carrierId: string
): Promise<ActionResult<{ qbId: string }>> {
  try {
    await requireRole("admin");

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    if (!supabase) return fail("Supabase not configured");

    const { data: carrier, error } = await supabase
      .from("carriers")
      .select("*")
      .eq("id", carrierId)
      .single();

    if (error || !carrier) return fail("Carrier not found");

    const { createOrUpdateVendor } = await import(
      "@/lib/services/quickbooks.service"
    );
    const result = await createOrUpdateVendor({
      id: carrier.id,
      name: carrier.name,
      contact_name: carrier.contact_name,
      email: carrier.email,
      phone: carrier.phone,
      address: carrier.address,
      ein: carrier.ein,
    });

    if (!result.success) return fail(result.error ?? "Failed to create vendor");

    revalidatePath("/admin/quickbooks");
    return ok({ qbId: result.qbId! });
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Setup: Create Service Items in QBO
// ---------------------------------------------------------------------------

export async function createQBItemsAction(): Promise<
  ActionResult<{ created: number; errors: string[] }>
> {
  try {
    await requireRole("admin");

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    if (!supabase) return fail("Supabase not configured");

    const { data: materials } = await supabase
      .from("materials")
      .select("id, name, description")
      .eq("status", "active");

    if (!materials || materials.length === 0) {
      return fail("No active materials found");
    }

    const { createOrUpdateItem } = await import(
      "@/lib/services/quickbooks.service"
    );

    let created = 0;
    const errors: string[] = [];

    for (const material of materials) {
      const result = await createOrUpdateItem({
        id: material.id,
        name: material.name,
        description: material.description,
      });

      if (result.success) {
        created++;
      } else {
        errors.push(`${material.name}: ${result.error}`);
      }
    }

    revalidatePath("/admin/quickbooks");
    return ok({ created, errors });
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Sync operations
// ---------------------------------------------------------------------------

export async function syncAllInvoicesAction(): Promise<
  ActionResult<{ synced: number; failed: number; errors: string[] }>
> {
  try {
    await requireRole("admin");

    const { syncAllInvoices } = await import(
      "@/lib/services/quickbooks.service"
    );
    const result = await syncAllInvoices();

    revalidatePath("/admin/quickbooks");
    revalidatePath("/admin/invoices");
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

export async function syncAllSettlementsAction(): Promise<
  ActionResult<{ synced: number; failed: number; errors: string[] }>
> {
  try {
    await requireRole("admin");

    const { syncAllSettlements } = await import(
      "@/lib/services/quickbooks.service"
    );
    const result = await syncAllSettlements();

    revalidatePath("/admin/quickbooks");
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

export async function runReconciliationAction(): Promise<
  ActionResult<{
    discrepancies: Array<{
      type: string;
      tmsId: string;
      qbId: string;
      issue: string;
    }>;
  }>
> {
  try {
    await requireRole("admin");

    const { reconcileWithQBO } = await import(
      "@/lib/services/quickbooks.service"
    );
    const result = await reconcileWithQBO();

    if (!result.success) return fail(result.error ?? "Reconciliation failed");

    revalidatePath("/admin/quickbooks");
    return ok({ discrepancies: result.discrepancies });
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Get sync logs
// ---------------------------------------------------------------------------

export async function getSyncLogsAction(): Promise<
  ActionResult<
    Array<{
      id: string;
      entity_type: string;
      entity_id: string;
      action: string;
      qb_entity_type: string | null;
      qb_entity_id: string | null;
      status: string;
      error_message: string | null;
      synced_at: string | null;
      created_at: string;
    }>
  >
> {
  try {
    await requireRole("admin");

    const { getSyncLogs } = await import(
      "@/lib/services/quickbooks.service"
    );
    const logs = await getSyncLogs(50);

    return ok(logs);
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------------
// Get setup status — what entities are configured in QBO
// ---------------------------------------------------------------------------

export async function getQBSetupStatusAction(): Promise<
  ActionResult<{
    customers: Array<{
      id: string;
      name: string;
      qb_customer_id: string | null;
    }>;
    carriers: Array<{
      id: string;
      name: string;
      qb_vendor_id: string | null;
    }>;
    materialCount: number;
  }>
> {
  try {
    await requireRole("admin");

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    if (!supabase) return fail("Supabase not configured");

    const [customersRes, carriersRes, materialsRes] = await Promise.all([
      supabase
        .from("customers")
        .select("id, name, qb_customer_id")
        .eq("status", "active")
        .order("name"),
      supabase
        .from("carriers")
        .select("id, name, qb_vendor_id")
        .eq("status", "active")
        .order("name"),
      supabase
        .from("materials")
        .select("id")
        .eq("status", "active"),
    ]);

    return ok({
      customers: customersRes.data ?? [],
      carriers: carriersRes.data ?? [],
      materialCount: materialsRes.data?.length ?? 0,
    });
  } catch (error) {
    return fail(error);
  }
}
