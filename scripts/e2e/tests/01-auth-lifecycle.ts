/**
 * 01 - Auth Lifecycle Tests
 *
 * Tests:
 *  1. Pending user can log in but profile status is "pending"
 *  2. Admin approves user -> status becomes "active"
 *  3. Deactivate user via ban -> login fails
 *  4. Reactivate user -> login succeeds again
 *  5. Self-role-change prevention (admin cannot change own role)
 *  6. All pending roles exist (customer, driver, carrier)
 *  7. Deactivated user cannot sign in (ban + "deactivated" status)
 */

import {
  createAdminClient,
  createAnonClient,
  assertSandboxMode,
  TestReporter,
} from "../lib/test-helpers";
import { TEST_ACCOUNTS, PENDING_TEST_ACCOUNTS } from "../lib/test-accounts";
import type { TestContext } from "../lib/types";

export async function runAuthLifecycleTests(ctx: TestContext): Promise<TestReporter> {
  const reporter = new TestReporter("01-Auth Lifecycle");
  const supabase = createAdminClient();
  await assertSandboxMode(supabase);

  console.log("--- 01: Auth Lifecycle ---\n");

  let step = 0;

  // Resolve pending user IDs
  const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const pendingCustomerUser = allUsers?.users?.find(
    (u) => u.email === PENDING_TEST_ACCOUNTS.pending_customer.email
  );
  const pendingDriverUser = allUsers?.users?.find(
    (u) => u.email === PENDING_TEST_ACCOUNTS.pending_driver.email
  );
  const pendingCarrierUser = allUsers?.users?.find(
    (u) => u.email === PENDING_TEST_ACCOUNTS.pending_carrier.email
  );

  // --- Step 1: Pending User Login ---
  step++;
  try {
    if (!pendingCustomerUser) throw new Error("Pending customer user not found -- run seed first");

    const pendingClient = createAnonClient();
    const { error: loginErr } = await pendingClient.auth.signInWithPassword({
      email: PENDING_TEST_ACCOUNTS.pending_customer.email,
      password: PENDING_TEST_ACCOUNTS.pending_customer.password,
    });

    if (loginErr) {
      reporter.fail(step, "Pending User Login", `Login failed: ${loginErr.message}`);
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", pendingCustomerUser.id)
        .single();

      reporter.assert(
        profile?.status === "pending",
        step,
        "Pending User Login",
        `Login succeeded, profile status: ${profile?.status}`
      );

      await pendingClient.auth.signOut();
    }
  } catch (err: any) {
    reporter.fail(step, "Pending User Login", err.message);
  }

  // --- Step 2: Admin Approval ---
  step++;
  try {
    if (!pendingCustomerUser) throw new Error("Pending customer user not found");

    const { error: approveErr } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", pendingCustomerUser.id);

    if (approveErr) throw approveErr;

    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", pendingCustomerUser.id)
      .single();

    reporter.assert(
      profile?.status === "active",
      step,
      "Admin Approval",
      `Profile status changed to: ${profile?.status}`
    );

    // Reset back to pending for subsequent runs
    await supabase
      .from("profiles")
      .update({ status: "pending" })
      .eq("id", pendingCustomerUser.id);
  } catch (err: any) {
    reporter.fail(step, "Admin Approval", err.message);
  }

  // --- Step 3: Deactivation (ban user) ---
  step++;
  try {
    if (!pendingDriverUser) throw new Error("Pending driver user not found");

    // Set profile to inactive
    await supabase
      .from("profiles")
      .update({ status: "inactive" })
      .eq("id", pendingDriverUser.id);

    // Ban the user via admin API
    const { error: banErr } = await supabase.auth.admin.updateUserById(
      pendingDriverUser.id,
      { ban_duration: "876000h" } // ~100 years
    );

    if (banErr) throw new Error(`Ban failed: ${banErr.message}`);

    // Attempt login -- should fail
    const bannedClient = createAnonClient();
    const { error: loginErr } = await bannedClient.auth.signInWithPassword({
      email: PENDING_TEST_ACCOUNTS.pending_driver.email,
      password: PENDING_TEST_ACCOUNTS.pending_driver.password,
    });

    reporter.assert(
      !!loginErr,
      step,
      "Deactivation (Ban)",
      loginErr
        ? `Login correctly blocked: ${loginErr.message}`
        : "Login should have been blocked but succeeded"
    );
  } catch (err: any) {
    reporter.fail(step, "Deactivation (Ban)", err.message);
  }

  // --- Step 4: Reactivation (unban user) ---
  step++;
  try {
    if (!pendingDriverUser) throw new Error("Pending driver user not found");

    // Unban the user
    const { error: unbanErr } = await supabase.auth.admin.updateUserById(
      pendingDriverUser.id,
      { ban_duration: "none" }
    );

    if (unbanErr) throw new Error(`Unban failed: ${unbanErr.message}`);

    // Set profile back to active
    await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", pendingDriverUser.id);

    // Attempt login -- should succeed now
    const reactivatedClient = createAnonClient();
    const { error: loginErr } = await reactivatedClient.auth.signInWithPassword({
      email: PENDING_TEST_ACCOUNTS.pending_driver.email,
      password: PENDING_TEST_ACCOUNTS.pending_driver.password,
    });

    reporter.assert(
      !loginErr,
      step,
      "Reactivation (Unban)",
      loginErr
        ? `Login still blocked: ${loginErr.message}`
        : "Login succeeded after reactivation"
    );

    await reactivatedClient.auth.signOut();

    // Reset back to pending for next run
    await supabase
      .from("profiles")
      .update({ status: "pending" })
      .eq("id", pendingDriverUser.id);
  } catch (err: any) {
    reporter.fail(step, "Reactivation (Unban)", err.message);
  }

  // --- Step 5: Self-role-change prevention ---
  step++;
  try {
    const adminUser = allUsers?.users?.find(
      (u) => u.email === TEST_ACCOUNTS.admin.email
    );
    if (!adminUser) throw new Error("Admin user not found");

    // Read current role
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", adminUser.id)
      .single();

    // Attempt to change via anon client (as admin user)
    const adminAnonClient = createAnonClient();
    const { error: signInErr } = await adminAnonClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.admin.email,
      password: TEST_ACCOUNTS.admin.password,
    });

    if (signInErr) throw new Error(`Admin login failed: ${signInErr.message}`);

    // Try updating own role to "customer"
    const { error: roleUpdateErr } = await adminAnonClient
      .from("profiles")
      .update({ role: "customer" })
      .eq("id", adminUser.id);

    // Re-read profile to see if role actually changed
    const { data: afterProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", adminUser.id)
      .single();

    const roleUnchanged = afterProfile?.role === "admin";

    // Reset role if it somehow changed
    if (!roleUnchanged) {
      await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", adminUser.id);
    }

    reporter.assert(
      roleUnchanged,
      step,
      "Self-role-change prevention",
      roleUnchanged
        ? "Admin role remained 'admin' after self-update attempt"
        : `Role changed to '${afterProfile?.role}' -- RLS policy missing`
    );

    await adminAnonClient.auth.signOut();
  } catch (err: any) {
    reporter.fail(step, "Self-role-change prevention", err.message);
  }

  // --- Step 6: All pending roles exist ---
  step++;
  try {
    const allPendingExist =
      !!pendingCustomerUser &&
      !!pendingDriverUser &&
      !!pendingCarrierUser;

    const { data: pendingProfiles } = await supabase
      .from("profiles")
      .select("id, role, status")
      .in("id", [
        pendingCustomerUser?.id ?? "",
        pendingDriverUser?.id ?? "",
        pendingCarrierUser?.id ?? "",
      ].filter(Boolean));

    const rolesFound = pendingProfiles?.map((p) => p.role).sort().join(", ") ?? "none";

    reporter.assert(
      allPendingExist,
      step,
      "All pending roles exist",
      `Roles: ${rolesFound}`
    );
  } catch (err: any) {
    reporter.fail(step, "All pending roles exist", err.message);
  }

  // --- Step 7: Deactivated user cannot sign in ---
  step++;
  try {
    if (!pendingCarrierUser) throw new Error("Pending carrier user not found");

    // Set profile to deactivated (distinct from inactive)
    await supabase
      .from("profiles")
      .update({ status: "deactivated", status_reason: "E2E deactivation test" })
      .eq("id", pendingCarrierUser.id);

    // Ban the user
    const { error: banErr } = await supabase.auth.admin.updateUserById(
      pendingCarrierUser.id,
      { ban_duration: "876000h" }
    );

    if (banErr) throw new Error(`Ban failed: ${banErr.message}`);

    // Attempt login -- should fail
    const deactivatedClient = createAnonClient();
    const { error: loginErr } = await deactivatedClient.auth.signInWithPassword({
      email: PENDING_TEST_ACCOUNTS.pending_carrier.email,
      password: PENDING_TEST_ACCOUNTS.pending_carrier.password,
    });

    reporter.assert(
      !!loginErr,
      step,
      "Deactivated user cannot sign in",
      loginErr
        ? `Login correctly blocked: ${loginErr.message}`
        : "Login should have been blocked but succeeded"
    );

    // Cleanup: unban and reset to pending
    await supabase.auth.admin.updateUserById(
      pendingCarrierUser.id,
      { ban_duration: "none" }
    );
    await supabase
      .from("profiles")
      .update({ status: "pending", status_reason: null })
      .eq("id", pendingCarrierUser.id);
  } catch (err: any) {
    reporter.fail(step, "Deactivated user cannot sign in", err.message);
  }

  reporter.printReport();
  return reporter;
}
