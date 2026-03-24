#!/usr/bin/env npx tsx
/**
 * JFT E2E Sandbox: Seed Test Data
 *
 * Creates all test business entities in the correct FK order.
 * Safe to run multiple times (idempotent via check-before-insert / upsert).
 *
 * Entities created:
 *   - 3 materials (Cushion Sand, Mason Sand, Top Soil)
 *   - 2 customers (TEST_DR_Horton, TEST_Kaufman_Co)
 *   - 1 carrier (TEST_CD_Hopkins)
 *   - 1 truck (TEST_Truck_01)
 *   - 1 driver (TEST_Chip_West)
 *   - 2 sites (TEST_Kaufman_Sand quarry, TEST_Frisco_Lakes jobsite)
 *   - 1 additional site (TEST_Ft_Worth_Site for second customer)
 *   - 5 rates (3 Horton customer, 1 Kaufman city-specific, 1 carrier)
 *   - 1 per_ton rate for edge case testing
 *   - 5 active test accounts (admin, customer, customer2, driver, carrier)
 *   - 3 pending lifecycle accounts (pending customer, pending driver, pending carrier)
 *
 * NOTE: Deliveries use net_weight = 1.0 for per_load rates (weight
 * still needs a non-null value for the PO trigger to increment properly).
 *
 * Usage:  npx tsx scripts/e2e/lib/seed-test-data.ts
 */

import { createAdminClient, assertSandboxMode, loadEnv } from "./test-helpers";
import { createTestAccounts, PENDING_TEST_ACCOUNTS } from "./test-accounts";

export interface SeedResult {
  customerId: string;
  customer2Id: string;
  carrierId: string;
  driverId: string;
  truckId: string;
  kaufmanSandId: string;
  friscoLakesId: string;
  ftWorthSiteId: string;
  materialIds: Record<string, string>;
  userIds: Record<string, string>;
  pendingUserIds: Record<string, string>;
}

export async function seedTestData(): Promise<SeedResult> {
  loadEnv();
  const supabase = createAdminClient();
  await assertSandboxMode(supabase);

  console.log("Seeding test data...\n");

  const summary: Array<{ label: string; detail: string }> = [];

  // =========================================================================
  // 1. Materials
  // =========================================================================
  console.log("1. Materials");

  const materialDefs = [
    { name: "Cushion Sand", unit_of_measure: "load" as const, description: "Cushion sand for pipe bedding and backfill" },
    { name: "Mason Sand", unit_of_measure: "load" as const, description: "Fine-grade mason sand for masonry and concrete work" },
    { name: "Top Soil", unit_of_measure: "load" as const, description: "Top soil for landscaping and grading" },
  ];

  const materialIds: Record<string, string> = {};

  for (const mat of materialDefs) {
    const { data: existing } = await supabase
      .from("materials")
      .select("id, name, unit_of_measure")
      .eq("name", mat.name)
      .single();

    if (existing) {
      materialIds[mat.name] = existing.id;
      if (existing.unit_of_measure !== "load") {
        await supabase.from("materials").update({ unit_of_measure: "load" }).eq("id", existing.id);
        console.log(`  Updated ${mat.name} unit to "load"`);
      } else {
        console.log(`  ${mat.name} already exists (${existing.id})`);
      }
    } else {
      const { data: created, error } = await supabase
        .from("materials")
        .insert(mat)
        .select("id")
        .single();

      if (error) {
        console.error(`  FAILED to create ${mat.name}: ${error.message}`);
        continue;
      }
      materialIds[mat.name] = created!.id;
      console.log(`  Created ${mat.name} (${created!.id})`);
    }
  }

  summary.push({
    label: "Materials",
    detail: `${Object.keys(materialIds).length} (${Object.keys(materialIds).join(", ")})`,
  });

  // =========================================================================
  // 2. Customer: TEST_DR_Horton
  // =========================================================================
  console.log("\n2. Customer: TEST_DR_Horton");

  let customerId: string;

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("name", "TEST_DR_Horton")
    .single();

  if (existingCustomer) {
    customerId = existingCustomer.id;
    console.log(`  TEST_DR_Horton already exists (${customerId})`);
    await supabase
      .from("customers")
      .update({
        billing_cycle: "biweekly",
        billing_address: "4306 Miller Rd, Rowlett TX 75088",
        billing_email: "test.customer@jft-test.local",
        vendor_number: "(DFWE)-1173061",
        payment_terms: "net_30",
        status: "active",
      })
      .eq("id", customerId);
  } else {
    const { data: created, error } = await supabase
      .from("customers")
      .insert({
        name: "TEST_DR_Horton",
        billing_cycle: "biweekly",
        billing_address: "4306 Miller Rd, Rowlett TX 75088",
        billing_email: "test.customer@jft-test.local",
        vendor_number: "(DFWE)-1173061",
        payment_terms: "net_30",
        status: "active",
        credit_limit: 0,
        credit_limit_enabled: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  FAILED to create customer: ${error.message}`);
      process.exit(1);
    }
    customerId = created!.id;
    console.log(`  Created TEST_DR_Horton (${customerId})`);
  }

  summary.push({ label: "Customer 1", detail: `TEST_DR_Horton (${customerId})` });

  // =========================================================================
  // 2b. Customer: TEST_Kaufman_Co (for cross-customer isolation testing)
  // =========================================================================
  console.log("\n2b. Customer: TEST_Kaufman_Co");

  let customer2Id: string;

  const { data: existingCustomer2 } = await supabase
    .from("customers")
    .select("id")
    .eq("name", "TEST_Kaufman_Co")
    .single();

  if (existingCustomer2) {
    customer2Id = existingCustomer2.id;
    console.log(`  TEST_Kaufman_Co already exists (${customer2Id})`);
    await supabase
      .from("customers")
      .update({
        billing_cycle: "monthly",
        billing_address: "PO Box 1917, Frisco TX 75034",
        billing_email: "test.customer2@jft-test.local",
        payment_terms: "net_30",
        status: "active",
      })
      .eq("id", customer2Id);
  } else {
    const { data: created, error } = await supabase
      .from("customers")
      .insert({
        name: "TEST_Kaufman_Co",
        billing_cycle: "monthly",
        billing_address: "PO Box 1917, Frisco TX 75034",
        billing_email: "test.customer2@jft-test.local",
        payment_terms: "net_30",
        status: "active",
        credit_limit: 0,
        credit_limit_enabled: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  FAILED to create customer2: ${error.message}`);
      process.exit(1);
    }
    customer2Id = created!.id;
    console.log(`  Created TEST_Kaufman_Co (${customer2Id})`);
  }

  summary.push({ label: "Customer 2", detail: `TEST_Kaufman_Co (${customer2Id})` });

  // =========================================================================
  // 3. Carrier: TEST_CD_Hopkins
  // =========================================================================
  console.log("\n3. Carrier");

  let carrierId: string;

  const { data: existingCarrier } = await supabase
    .from("carriers")
    .select("id")
    .eq("name", "TEST_CD_Hopkins")
    .single();

  if (existingCarrier) {
    carrierId = existingCarrier.id;
    console.log(`  TEST_CD_Hopkins already exists (${carrierId})`);
    await supabase
      .from("carriers")
      .update({
        dispatch_fee_weekly: 1000,
        is_1099_tracked: true,
        payment_terms: "net_14",
        status: "active",
      })
      .eq("id", carrierId);
  } else {
    const { data: created, error } = await supabase
      .from("carriers")
      .insert({
        name: "TEST_CD_Hopkins",
        dispatch_fee_weekly: 1000,
        is_1099_tracked: true,
        payment_terms: "net_14",
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  FAILED to create carrier: ${error.message}`);
      process.exit(1);
    }
    carrierId = created!.id;
    console.log(`  Created TEST_CD_Hopkins (${carrierId})`);
  }

  summary.push({ label: "Carrier", detail: `TEST_CD_Hopkins (${carrierId})` });

  // =========================================================================
  // 4. Truck: TEST_Truck_01
  // =========================================================================
  console.log("\n4. Truck");

  let truckId: string;

  const { data: existingTruck } = await supabase
    .from("trucks")
    .select("id")
    .eq("number", "TEST_Truck_01")
    .eq("carrier_id", carrierId)
    .single();

  if (existingTruck) {
    truckId = existingTruck.id;
    console.log(`  TEST_Truck_01 already exists (${truckId})`);
  } else {
    const { data: created, error } = await supabase
      .from("trucks")
      .insert({
        carrier_id: carrierId,
        number: "TEST_Truck_01",
        type: "dump_truck",
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  FAILED to create truck: ${error.message}`);
      process.exit(1);
    }
    truckId = created!.id;
    console.log(`  Created TEST_Truck_01 (${truckId})`);
  }

  summary.push({ label: "Truck", detail: `TEST_Truck_01 (${truckId})` });

  // =========================================================================
  // 5. Driver: TEST_Chip_West
  // =========================================================================
  console.log("\n5. Driver");

  let driverId: string;

  const { data: existingDriver } = await supabase
    .from("drivers")
    .select("id")
    .eq("name", "TEST_Chip_West")
    .eq("carrier_id", carrierId)
    .single();

  if (existingDriver) {
    driverId = existingDriver.id;
    console.log(`  TEST_Chip_West already exists (${driverId})`);
    await supabase
      .from("drivers")
      .update({ truck_id: truckId, status: "active" })
      .eq("id", driverId);
  } else {
    const { data: created, error } = await supabase
      .from("drivers")
      .insert({
        carrier_id: carrierId,
        name: "TEST_Chip_West",
        phone: "555-TEST-DRV",
        email: "test.driver@jft-test.local",
        truck_id: truckId,
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  FAILED to create driver: ${error.message}`);
      process.exit(1);
    }
    driverId = created!.id;
    console.log(`  Created TEST_Chip_West (${driverId})`);
  }

  summary.push({ label: "Driver", detail: `TEST_Chip_West (${driverId})` });

  // =========================================================================
  // 6. Sites
  // =========================================================================
  console.log("\n6. Sites");

  // Quarry: TEST_Kaufman_Sand
  let kaufmanSandId: string;

  const { data: existingQuarry } = await supabase
    .from("sites")
    .select("id")
    .eq("name", "TEST_Kaufman_Sand")
    .single();

  if (existingQuarry) {
    kaufmanSandId = existingQuarry.id;
    console.log(`  TEST_Kaufman_Sand already exists (${kaufmanSandId})`);
  } else {
    const { data: created, error } = await supabase
      .from("sites")
      .insert({
        name: "TEST_Kaufman_Sand",
        type: "quarry",
        city: "Kaufman",
        state: "TX",
        status: "active",
        geofence_radius_meters: 500,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  FAILED to create quarry site: ${error.message}`);
      process.exit(1);
    }
    kaufmanSandId = created!.id;
    console.log(`  Created TEST_Kaufman_Sand (${kaufmanSandId})`);
  }

  // Jobsite: TEST_Frisco_Lakes (for customer 1)
  let friscoLakesId: string;

  const { data: existingJobsite } = await supabase
    .from("sites")
    .select("id")
    .eq("name", "TEST_Frisco_Lakes")
    .single();

  if (existingJobsite) {
    friscoLakesId = existingJobsite.id;
    console.log(`  TEST_Frisco_Lakes already exists (${friscoLakesId})`);
    await supabase
      .from("sites")
      .update({
        customer_id: customerId,
        subdivision_name: "Frisco Lakes",
        project_number: "99999",
        city: "Frisco",
      })
      .eq("id", friscoLakesId);
  } else {
    const { data: created, error } = await supabase
      .from("sites")
      .insert({
        name: "TEST_Frisco_Lakes",
        type: "jobsite",
        customer_id: customerId,
        city: "Frisco",
        state: "TX",
        subdivision_name: "Frisco Lakes",
        project_number: "99999",
        status: "active",
        geofence_radius_meters: 500,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  FAILED to create jobsite: ${error.message}`);
      process.exit(1);
    }
    friscoLakesId = created!.id;
    console.log(`  Created TEST_Frisco_Lakes (${friscoLakesId})`);
  }

  // Jobsite: TEST_Ft_Worth_Site (for customer 2 -- Kaufman Co, city-specific rates)
  let ftWorthSiteId: string;

  const { data: existingFtWorth } = await supabase
    .from("sites")
    .select("id")
    .eq("name", "TEST_Ft_Worth_Site")
    .single();

  if (existingFtWorth) {
    ftWorthSiteId = existingFtWorth.id;
    console.log(`  TEST_Ft_Worth_Site already exists (${ftWorthSiteId})`);
    await supabase
      .from("sites")
      .update({ customer_id: customer2Id, city: "Ft Worth" })
      .eq("id", ftWorthSiteId);
  } else {
    const { data: created, error } = await supabase
      .from("sites")
      .insert({
        name: "TEST_Ft_Worth_Site",
        type: "jobsite",
        customer_id: customer2Id,
        city: "Ft Worth",
        state: "TX",
        status: "active",
        geofence_radius_meters: 500,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  FAILED to create Ft Worth site: ${error.message}`);
      process.exit(1);
    }
    ftWorthSiteId = created!.id;
    console.log(`  Created TEST_Ft_Worth_Site (${ftWorthSiteId})`);
  }

  summary.push({
    label: "Sites",
    detail: `3 (TEST_Kaufman_Sand, TEST_Frisco_Lakes, TEST_Ft_Worth_Site)`,
  });

  // =========================================================================
  // 7. Rates
  // =========================================================================
  console.log("\n7. Rates");

  const today = new Date().toISOString().split("T")[0];

  const rateDefs = [
    {
      label: "DR_Horton + Cushion Sand (Frisco)",
      type: "customer" as const,
      customer_id: customerId,
      carrier_id: null,
      material_id: materialIds["Cushion Sand"],
      rate_per_unit: 185,
      rate_type: "per_load" as const,
      delivery_city: "Frisco" as string | null,
    },
    {
      label: "DR_Horton + Mason Sand (Frisco)",
      type: "customer" as const,
      customer_id: customerId,
      carrier_id: null,
      material_id: materialIds["Mason Sand"],
      rate_per_unit: 375,
      rate_type: "per_load" as const,
      delivery_city: "Frisco" as string | null,
    },
    {
      label: "DR_Horton + Top Soil (Frisco)",
      type: "customer" as const,
      customer_id: customerId,
      carrier_id: null,
      material_id: materialIds["Top Soil"],
      rate_per_unit: 185,
      rate_type: "per_load" as const,
      delivery_city: "Frisco" as string | null,
    },
    {
      label: "Kaufman_Co + Cushion Sand (Ft Worth)",
      type: "customer" as const,
      customer_id: customer2Id,
      carrier_id: null,
      material_id: materialIds["Cushion Sand"],
      rate_per_unit: 260,
      rate_type: "per_load" as const,
      delivery_city: "Ft Worth" as string | null,
    },
    {
      label: "CD_Hopkins + Cushion Sand",
      type: "carrier" as const,
      customer_id: null,
      carrier_id: carrierId,
      material_id: materialIds["Cushion Sand"],
      rate_per_unit: 130,
      rate_type: "per_load" as const,
      delivery_city: null as string | null,
    },
    {
      label: "DR_Horton + Cushion Sand per_ton (edge case)",
      type: "customer" as const,
      customer_id: customerId,
      carrier_id: null,
      material_id: materialIds["Cushion Sand"],
      rate_per_unit: 18.5,
      rate_type: "per_ton" as const,
      delivery_city: "EdgeCaseCity" as string | null,
    },
  ];

  let ratesCreated = 0;
  let ratesExisted = 0;

  for (const rateDef of rateDefs) {
    let query = supabase
      .from("rates")
      .select("id")
      .eq("type", rateDef.type)
      .eq("material_id", rateDef.material_id);

    if (rateDef.customer_id) {
      query = query.eq("customer_id", rateDef.customer_id);
    }
    if (rateDef.carrier_id) {
      query = query.eq("carrier_id", rateDef.carrier_id);
    }
    if (rateDef.delivery_city) {
      query = query.eq("delivery_city", rateDef.delivery_city);
    } else {
      query = query.is("delivery_city", null);
    }

    const { data: existingRate } = await query.maybeSingle();

    if (existingRate) {
      await supabase
        .from("rates")
        .update({ rate_per_unit: rateDef.rate_per_unit, rate_type: rateDef.rate_type })
        .eq("id", existingRate.id);
      console.log(`  ${rateDef.label}: already exists, updated rate`);
      ratesExisted++;
    } else {
      const insertData: Record<string, unknown> = {
        type: rateDef.type,
        customer_id: rateDef.customer_id,
        carrier_id: rateDef.carrier_id,
        material_id: rateDef.material_id,
        rate_per_unit: rateDef.rate_per_unit,
        rate_type: rateDef.rate_type,
        effective_date: today,
      };

      if (rateDef.delivery_city) {
        insertData.delivery_city = rateDef.delivery_city;
      }

      const { error } = await supabase.from("rates").insert(insertData);

      if (error) {
        console.error(`  FAILED ${rateDef.label}: ${error.message}`);
      } else {
        console.log(`  Created ${rateDef.label}: $${rateDef.rate_per_unit}/${rateDef.rate_type}`);
        ratesCreated++;
      }
    }
  }

  summary.push({
    label: "Rates",
    detail: `${ratesCreated + ratesExisted} (4 customer per_load, 1 customer per_ton, 1 carrier)`,
  });

  // =========================================================================
  // 8. Test Accounts (active)
  // =========================================================================
  console.log("\n8. Active Test Accounts");

  const userIds = await createTestAccounts(supabase, {
    customerId,
    carrierId,
    customer2Id,
  });

  // Link driver profile to driver record
  if (userIds.driver) {
    await supabase
      .from("drivers")
      .update({ profile_id: userIds.driver })
      .eq("id", driverId);
    console.log(`  Linked driver profile to driver record`);
  }

  summary.push({
    label: "Active Accounts",
    detail: `${Object.keys(userIds).length} (${Object.keys(userIds).join(", ")})`,
  });

  // =========================================================================
  // 9. Pending Lifecycle Test Accounts
  // =========================================================================
  console.log("\n9. Pending Lifecycle Accounts");

  const pendingUserIds: Record<string, string> = {};

  for (const [key, account] of Object.entries(PENDING_TEST_ACCOUNTS)) {
    const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = allUsers?.users?.find((u) => u.email === account.email);

    if (existing) {
      console.log(`  Pending ${key} already exists (${existing.id})`);
      pendingUserIds[key] = existing.id;

      await supabase
        .from("profiles")
        .update({
          role: account.role,
          full_name: account.fullName,
          status: "pending",
        })
        .eq("id", existing.id);
    } else {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          role: account.role,
          full_name: account.fullName,
        },
        app_metadata: {
          role: account.role,
        },
      });

      if (error) {
        console.error(`  Failed to create pending ${key}: ${error.message}`);
        continue;
      }

      if (!created.user) {
        console.error(`  Created pending ${key} but no user object returned`);
        continue;
      }

      pendingUserIds[key] = created.user.id;
      console.log(`  Created pending ${key} (${created.user.id})`);

      await new Promise((r) => setTimeout(r, 500));
      await supabase
        .from("profiles")
        .update({
          role: account.role,
          full_name: account.fullName,
          status: "pending",
        })
        .eq("id", created.user.id);
    }
  }

  summary.push({
    label: "Pending Accounts",
    detail: `${Object.keys(pendingUserIds).length} (${Object.keys(pendingUserIds).join(", ")})`,
  });

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n" + "=".repeat(50));
  console.log("  SEED COMPLETE");
  console.log("=".repeat(50));

  for (const s of summary) {
    console.log(`  [OK] ${s.label}: ${s.detail}`);
  }

  console.log("=".repeat(50));

  const result: SeedResult = {
    customerId,
    customer2Id,
    carrierId,
    driverId,
    truckId,
    kaufmanSandId,
    friscoLakesId,
    ftWorthSiteId,
    materialIds,
    userIds,
    pendingUserIds,
  };

  console.log("\nTest entity IDs (for reference):");
  console.log(JSON.stringify(result, null, 2));

  return result;
}

// Allow direct execution
if (require.main === module) {
  seedTestData().catch((err) => {
    console.error("\nFATAL:", err);
    process.exit(1);
  });
}
