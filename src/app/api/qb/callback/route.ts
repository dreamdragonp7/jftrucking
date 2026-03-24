import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/supabase/auth";
import { handleCallback } from "@/lib/integrations/quickbooks/client";
import {
  getOAuthState,
  clearOAuthState,
} from "@/lib/integrations/quickbooks/tokens";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/qb/callback
 *
 * QuickBooks OAuth callback handler.
 * Receives the authorization code after the user authorizes in QuickBooks.
 * Exchanges the code for access/refresh tokens and stores them in Supabase.
 * Redirects to admin QuickBooks settings page with result.
 *
 * Security:
 * - Only admins can complete the OAuth flow
 * - State parameter is validated against server-stored value to prevent CSRF
 */
export async function GET(request: NextRequest) {
  // Only admins can complete OAuth connection
  try {
    await requireRole("admin");
  } catch {
    const redirectUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle error from Intuit (e.g., user denied access)
  if (error) {
    console.error("[QB Callback] OAuth error:", error);
    const redirectUrl = new URL("/admin/quickbooks", request.url);
    redirectUrl.searchParams.set("error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !realmId) {
    const redirectUrl = new URL("/admin/quickbooks", request.url);
    redirectUrl.searchParams.set("error", "missing_params");
    return NextResponse.redirect(redirectUrl);
  }

  // Validate state parameter to prevent CSRF
  if (!state) {
    const redirectUrl = new URL("/admin/quickbooks", request.url);
    redirectUrl.searchParams.set("error", "missing_state");
    return NextResponse.redirect(redirectUrl);
  }

  // Verify state matches what we stored during getAuthorizationUrl()
  const storedState = await getOAuthState();
  if (!storedState || state !== storedState) {
    console.error("[QB Callback] State mismatch — possible CSRF attack");
    await clearOAuthState();
    const redirectUrl = new URL("/admin/quickbooks", request.url);
    redirectUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(redirectUrl);
  }

  // State validated — clear it so it cannot be reused
  await clearOAuthState();

  try {
    // Exchange code for tokens — this stores tokens in Supabase
    const callbackUrl = request.nextUrl.toString();
    const result = await handleCallback(callbackUrl);

    console.log(
      `[QB Callback] Successfully connected to QuickBooks. Realm: ${result.realmId}, Company: ${result.companyName}`
    );

    // Fire-and-forget: auto-setup customers, vendors, and service items in QBO
    autoSetupQBOEntities().catch((setupErr) => {
      console.error("[QB Callback] Auto-setup failed (non-critical):", setupErr);
    });

    // Redirect to admin QuickBooks page with success
    const redirectUrl = new URL("/admin/quickbooks", request.url);
    redirectUrl.searchParams.set("connected", "true");
    if (result.companyName) {
      redirectUrl.searchParams.set("company", result.companyName);
    }
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("[QB Callback] Failed to exchange tokens:", err);

    const redirectUrl = new URL("/admin/quickbooks", request.url);
    redirectUrl.searchParams.set(
      "error",
      err instanceof Error ? err.message : "token_exchange_failed"
    );
    return NextResponse.redirect(redirectUrl);
  }
}

// ---------------------------------------------------------------------------
// Auto-Setup: push existing TMS entities into QBO on first connection
// ---------------------------------------------------------------------------

async function autoSetupQBOEntities(): Promise<void> {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      console.warn("[QB Auto-Setup] Supabase admin client not available");
      return;
    }

    // Dynamically import the QB service functions
    const {
      createOrUpdateCustomer,
      createOrUpdateVendor,
      createOrUpdateItem,
    } = await import("@/lib/services/quickbooks.service");

    // --- 1. Sync customers without qb_customer_id ---
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, billing_email, billing_address, phone")
      .is("qb_customer_id", null)
      .eq("status", "active");

    if (customers && customers.length > 0) {
      console.log(`[QB Auto-Setup] Syncing ${customers.length} customer(s) to QBO...`);
      let custOk = 0;
      let custFail = 0;
      for (const c of customers) {
        try {
          const res = await createOrUpdateCustomer(c);
          if (res.success) custOk++;
          else custFail++;
        } catch {
          custFail++;
        }
      }
      console.log(`[QB Auto-Setup] Customers: ${custOk} synced, ${custFail} failed`);
    }

    // --- 2. Sync carriers without qb_vendor_id ---
    const { data: carriers } = await supabase
      .from("carriers")
      .select("id, name, contact_name, email, phone, address, ein")
      .is("qb_vendor_id", null)
      .eq("status", "active");

    if (carriers && carriers.length > 0) {
      console.log(`[QB Auto-Setup] Syncing ${carriers.length} carrier(s) as QBO vendors...`);
      let vendOk = 0;
      let vendFail = 0;
      for (const c of carriers) {
        try {
          const res = await createOrUpdateVendor(c);
          if (res.success) vendOk++;
          else vendFail++;
        } catch {
          vendFail++;
        }
      }
      console.log(`[QB Auto-Setup] Vendors: ${vendOk} synced, ${vendFail} failed`);
    }

    // --- 3. Create service items for materials ---
    const { data: materials } = await supabase
      .from("materials")
      .select("id, name, description")
      .eq("status", "active");

    if (materials && materials.length > 0) {
      console.log(`[QB Auto-Setup] Syncing ${materials.length} material(s) as QBO service items...`);
      let itemOk = 0;
      let itemFail = 0;
      for (const m of materials) {
        try {
          const res = await createOrUpdateItem(m);
          if (res.success) itemOk++;
          else itemFail++;
        } catch {
          itemFail++;
        }
      }
      console.log(`[QB Auto-Setup] Items: ${itemOk} synced, ${itemFail} failed`);
    }

    console.log("[QB Auto-Setup] Complete");
  } catch (err) {
    // Catch-all: never let auto-setup break the OAuth callback
    console.error(
      "[QB Auto-Setup] Unexpected error:",
      err instanceof Error ? err.message : err
    );
  }
}
