/**
 * JFT E2E Test Account Definitions and CRUD
 *
 * Defines the 4 active test user accounts + 2 pending lifecycle accounts
 * + 1 second customer account for cross-customer isolation testing,
 * and provides functions to create and delete them via Supabase Auth Admin API.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Test Account Definitions (active)
// ---------------------------------------------------------------------------

export const TEST_ACCOUNTS = {
  admin: {
    email: "test.admin@jft-test.local",
    password: "TestAdmin2026!",
    role: "admin" as const,
    fullName: "TEST Admin User",
    companyName: undefined as string | undefined,
  },
  customer: {
    email: "test.customer@jft-test.local",
    password: "TestCust2026!",
    role: "customer" as const,
    fullName: "TEST Customer Rep",
    companyName: "TEST_DR_Horton",
  },
  driver: {
    email: "test.driver@jft-test.local",
    password: "TestDrvr2026!",
    role: "driver" as const,
    fullName: "TEST_Chip_West",
    companyName: undefined as string | undefined,
  },
  carrier: {
    email: "test.carrier@jft-test.local",
    password: "TestCarr2026!",
    role: "carrier" as const,
    fullName: "TEST Terrie Hopkins",
    companyName: "TEST_CD_Hopkins",
  },
} as const;

// ---------------------------------------------------------------------------
// Second Customer Account (for cross-customer isolation testing)
// ---------------------------------------------------------------------------

export const TEST_CUSTOMER2_ACCOUNT = {
  email: "test.customer2@jft-test.local",
  password: "TestCust2_2026!",
  role: "customer" as const,
  fullName: "TEST Kaufman Rep",
  companyName: "TEST_Kaufman_Co",
};

// ---------------------------------------------------------------------------
// Pending Lifecycle Test Accounts
// ---------------------------------------------------------------------------

export const PENDING_TEST_ACCOUNTS = {
  pending_customer: {
    email: "test.pending.customer@jft-test.local",
    password: "TestPendCust2026!",
    role: "customer" as const,
    fullName: "TEST Pending Customer",
  },
  pending_driver: {
    email: "test.pending.driver@jft-test.local",
    password: "TestPendDrvr2026!",
    role: "driver" as const,
    fullName: "TEST Pending Driver",
  },
  pending_carrier: {
    email: "test.pending.carrier@jft-test.local",
    password: "TestPendCarr2026!",
    role: "carrier" as const,
    fullName: "TEST Pending Carrier",
  },
} as const;

export const TEST_EMAIL_DOMAIN = "@jft-test.local";

// ---------------------------------------------------------------------------
// User List Cache
// ---------------------------------------------------------------------------

interface CachedUser {
  id: string;
  email?: string;
}

let cachedUsers: CachedUser[] | null = null;

async function getCachedUserList(
  supabase: SupabaseClient
): Promise<CachedUser[]> {
  if (cachedUsers) return cachedUsers;

  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  cachedUsers = (data?.users ?? []).map((u) => ({ id: u.id, email: u.email }));
  return cachedUsers;
}

export function invalidateUserCache(): void {
  cachedUsers = null;
}

// ---------------------------------------------------------------------------
// Create Test Accounts
// ---------------------------------------------------------------------------

export async function createTestAccounts(
  supabase: SupabaseClient,
  ids?: { customerId?: string; carrierId?: string; customer2Id?: string }
): Promise<Record<string, string>> {
  const userIds: Record<string, string> = {};
  const users = await getCachedUserList(supabase);

  // Create active test accounts
  for (const [key, account] of Object.entries(TEST_ACCOUNTS)) {
    const existing = users.find((u) => u.email === account.email);

    if (existing) {
      console.log(`  Account ${key} already exists (${existing.id})`);
      userIds[key] = existing.id;

      const profileUpdate: Record<string, unknown> = {
        role: account.role,
        full_name: account.fullName,
        status: "active",
      };
      if (account.companyName) {
        profileUpdate.company_name = account.companyName;
      }
      if (key === "customer" && ids?.customerId) {
        profileUpdate.customer_id = ids.customerId;
      }
      if (key === "carrier" && ids?.carrierId) {
        profileUpdate.carrier_id = ids.carrierId;
      }

      await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", existing.id);

      continue;
    }

    const { data: created, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        role: account.role,
        full_name: account.fullName,
        company_name: account.companyName,
      },
      app_metadata: {
        role: account.role,
      },
    });

    if (error) {
      console.error(`  Failed to create ${key} account: ${error.message}`);
      continue;
    }

    if (!created.user) {
      console.error(`  Created ${key} but no user object returned`);
      continue;
    }

    userIds[key] = created.user.id;
    invalidateUserCache();
    console.log(`  Created ${key} account (${created.user.id})`);

    await new Promise((r) => setTimeout(r, 500));

    const profileUpdate: Record<string, unknown> = {
      role: account.role,
      full_name: account.fullName,
      status: "active",
    };
    if (account.companyName) {
      profileUpdate.company_name = account.companyName;
    }
    if (key === "customer" && ids?.customerId) {
      profileUpdate.customer_id = ids.customerId;
    }
    if (key === "carrier" && ids?.carrierId) {
      profileUpdate.carrier_id = ids.carrierId;
    }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", created.user.id);

    if (profileErr) {
      console.error(
        `  Warning: could not update profile for ${key}: ${profileErr.message}`
      );
    }
  }

  // Create second customer account
  if (ids?.customer2Id) {
    const existing2 = users.find((u) => u.email === TEST_CUSTOMER2_ACCOUNT.email);
    if (existing2) {
      console.log(`  Account customer2 already exists (${existing2.id})`);
      userIds.customer2 = existing2.id;
      await supabase
        .from("profiles")
        .update({
          role: TEST_CUSTOMER2_ACCOUNT.role,
          full_name: TEST_CUSTOMER2_ACCOUNT.fullName,
          company_name: TEST_CUSTOMER2_ACCOUNT.companyName,
          customer_id: ids.customer2Id,
          status: "active",
        })
        .eq("id", existing2.id);
    } else {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: TEST_CUSTOMER2_ACCOUNT.email,
        password: TEST_CUSTOMER2_ACCOUNT.password,
        email_confirm: true,
        user_metadata: {
          role: TEST_CUSTOMER2_ACCOUNT.role,
          full_name: TEST_CUSTOMER2_ACCOUNT.fullName,
          company_name: TEST_CUSTOMER2_ACCOUNT.companyName,
        },
        app_metadata: { role: TEST_CUSTOMER2_ACCOUNT.role },
      });

      if (error) {
        console.error(`  Failed to create customer2 account: ${error.message}`);
      } else if (created.user) {
        userIds.customer2 = created.user.id;
        invalidateUserCache();
        console.log(`  Created customer2 account (${created.user.id})`);
        await new Promise((r) => setTimeout(r, 500));
        await supabase
          .from("profiles")
          .update({
            role: TEST_CUSTOMER2_ACCOUNT.role,
            full_name: TEST_CUSTOMER2_ACCOUNT.fullName,
            company_name: TEST_CUSTOMER2_ACCOUNT.companyName,
            customer_id: ids.customer2Id,
            status: "active",
          })
          .eq("id", created.user.id);
      }
    }
  }

  return userIds;
}

// ---------------------------------------------------------------------------
// Delete Test Accounts
// ---------------------------------------------------------------------------

export async function deleteTestAccounts(
  supabase: SupabaseClient
): Promise<number> {
  let deleted = 0;

  const users = await getCachedUserList(supabase);
  const testUsers = users.filter((u) => u.email?.endsWith(TEST_EMAIL_DOMAIN));

  for (const user of testUsers) {
    await supabase.from("profiles").delete().eq("id", user.id);

    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(
        `  Warning: could not delete user ${user.email}: ${error.message}`
      );
    } else {
      console.log(`  Deleted user ${user.email}`);
      deleted++;
    }
  }

  invalidateUserCache();
  return deleted;
}
