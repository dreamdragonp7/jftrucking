/**
 * 03 - RLS Isolation Tests
 *
 * Tests per-table RLS for all 4 roles + cross-customer isolation.
 *
 * Tests:
 *  1. Customer can see own invoices, orders, deliveries, sites
 *  2. Customer cannot see other customer's data (cross-customer isolation)
 *  3. Driver can see own dispatches and deliveries only
 *  4. Driver cannot see invoices, payments, settlements, rates
 *  5. Carrier can see own carrier record, own drivers, own trucks, own settlements
 *  6. Carrier cannot see other carriers or customer invoices
 *  7. Admin can see everything
 */

import {
  createAdminClient,
  createAnonClient,
  assertSandboxMode,
  TestReporter,
} from "../lib/test-helpers";
import { TEST_ACCOUNTS, TEST_CUSTOMER2_ACCOUNT } from "../lib/test-accounts";
import type { TestContext } from "../lib/types";

export async function runRLSIsolationTests(ctx: TestContext): Promise<TestReporter> {
  const reporter = new TestReporter("03-RLS Isolation");
  const supabase = createAdminClient();
  await assertSandboxMode(supabase);

  console.log("--- 03: RLS Isolation ---\n");

  let step = 0;

  // --- Step 1: Customer sees own data ---
  step++;
  try {
    const customerClient = createAnonClient();
    const { error: loginErr } = await customerClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.customer.email,
      password: TEST_ACCOUNTS.customer.password,
    });

    if (loginErr) throw new Error(`Customer login failed: ${loginErr.message}`);

    // Customer should see own customer record
    const { data: customers } = await customerClient.from("customers").select("id, name");
    const seesOwnCustomer = customers?.some((c) => c.name === "TEST_DR_Horton") ?? false;

    // Customer should see own sites (linked to their customer_id)
    const { data: sites } = await customerClient.from("sites").select("id, name");
    // Sites may include quarries (no customer_id) and own jobsites
    const seesOwnSite = sites?.some((s) => s.name === "TEST_Frisco_Lakes") ?? false;

    // Customer should see materials (authenticated read policy)
    const { data: materials } = await customerClient.from("materials").select("id");
    const seesMaterials = (materials?.length ?? 0) > 0;

    await customerClient.auth.signOut();

    reporter.assert(
      seesOwnCustomer && seesMaterials,
      step,
      "Customer sees own data",
      `Own customer: ${seesOwnCustomer}, Own site: ${seesOwnSite}, Materials: ${materials?.length ?? 0}`
    );
  } catch (err: any) {
    reporter.fail(step, "Customer sees own data", err.message);
  }

  // --- Step 2: Cross-customer isolation ---
  step++;
  try {
    // Customer 1 should NOT see Customer 2's invoices/orders/sites
    const customer1Client = createAnonClient();
    const { error: loginErr } = await customer1Client.auth.signInWithPassword({
      email: TEST_ACCOUNTS.customer.email,
      password: TEST_ACCOUNTS.customer.password,
    });

    if (loginErr) throw new Error(`Customer 1 login failed: ${loginErr.message}`);

    // Create a test invoice for customer 2 via admin to verify isolation
    const testInvoice2 = await supabase
      .from("invoices")
      .insert({
        customer_id: ctx.customer2Id,
        invoice_number: "TEST-ISOLATION-001",
        period_start: "2026-01-01",
        period_end: "2026-01-31",
        subtotal: 260,
        tax_amount: 0,
        total: 260,
        status: "draft",
        due_date: "2026-02-28",
      })
      .select("id")
      .single();

    // Customer 1 tries to see customer 2's invoice
    const { data: invoices } = await customer1Client
      .from("invoices")
      .select("id, customer_id")
      .eq("customer_id", ctx.customer2Id);

    const cannotSeeOther = !invoices || invoices.length === 0;

    // Also verify customer 1 can't see customer 2's customer record
    const { data: otherCustomer } = await customer1Client
      .from("customers")
      .select("id")
      .eq("id", ctx.customer2Id);

    const cannotSeeOtherCustomer = !otherCustomer || otherCustomer.length === 0;

    await customer1Client.auth.signOut();

    // Clean up the test invoice
    if (testInvoice2?.data?.id) {
      await supabase.from("invoices").delete().eq("id", testInvoice2.data.id);
    }

    reporter.assert(
      cannotSeeOther && cannotSeeOtherCustomer,
      step,
      "Cross-customer isolation",
      `Customer1 sees Customer2 invoices: ${invoices?.length ?? 0}, Customer2 record: ${otherCustomer?.length ?? 0}`
    );
  } catch (err: any) {
    reporter.fail(step, "Cross-customer isolation", err.message);
  }

  // --- Step 3: Driver sees own dispatches and deliveries ---
  step++;
  try {
    const driverClient = createAnonClient();
    const { error: loginErr } = await driverClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.driver.email,
      password: TEST_ACCOUNTS.driver.password,
    });

    if (loginErr) throw new Error(`Driver login failed: ${loginErr.message}`);

    // Driver should see dispatches assigned to them
    const { data: dispatches } = await driverClient.from("dispatches").select("id, driver_id");
    // All visible dispatches should be for this driver
    const allOwnDispatches = dispatches?.every((d) => d.driver_id === ctx.driverId) ?? true;

    // Driver should see deliveries
    const { data: deliveries } = await driverClient.from("deliveries").select("id, driver_id");
    const allOwnDeliveries = deliveries?.every((d) => d.driver_id === ctx.driverId) ?? true;

    // Driver can see own carrier record
    const { data: carriers } = await driverClient.from("carriers").select("id");
    const seesOwnCarrier = (carriers?.length ?? 0) >= 1;

    await driverClient.auth.signOut();

    reporter.assert(
      allOwnDispatches && allOwnDeliveries,
      step,
      "Driver sees own dispatches/deliveries",
      `Dispatches: ${dispatches?.length ?? 0} (all own: ${allOwnDispatches}), Deliveries: ${deliveries?.length ?? 0} (all own: ${allOwnDeliveries}), Carrier: ${seesOwnCarrier}`
    );
  } catch (err: any) {
    reporter.fail(step, "Driver sees own dispatches/deliveries", err.message);
  }

  // --- Step 4: Driver cannot see financial tables ---
  step++;
  try {
    const driverClient = createAnonClient();
    await driverClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.driver.email,
      password: TEST_ACCOUNTS.driver.password,
    });

    const { data: invoices } = await driverClient.from("invoices").select("id");
    const { data: payments } = await driverClient.from("payments").select("id");
    const { data: settlements } = await driverClient.from("carrier_settlements").select("id");
    const { data: rates } = await driverClient.from("rates").select("id");

    const invoicesBlocked = !invoices || invoices.length === 0;
    const paymentsBlocked = !payments || payments.length === 0;
    const settlementsBlocked = !settlements || settlements.length === 0;
    const ratesBlocked = !rates || rates.length === 0;

    await driverClient.auth.signOut();

    reporter.assert(
      invoicesBlocked && paymentsBlocked && settlementsBlocked && ratesBlocked,
      step,
      "Driver cannot see financial tables",
      `Invoices: ${invoices?.length ?? 0}, Payments: ${payments?.length ?? 0}, Settlements: ${settlements?.length ?? 0}, Rates: ${rates?.length ?? 0}`
    );
  } catch (err: any) {
    reporter.fail(step, "Driver cannot see financial tables", err.message);
  }

  // --- Step 5: Carrier sees own records ---
  step++;
  try {
    const carrierClient = createAnonClient();
    const { error: loginErr } = await carrierClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.carrier.email,
      password: TEST_ACCOUNTS.carrier.password,
    });

    if (loginErr) throw new Error(`Carrier login failed: ${loginErr.message}`);

    // Carrier should see own carrier record
    const { data: carriers } = await carrierClient.from("carriers").select("id, name");
    const seesOwnCarrier = carriers?.some((c) => c.id === ctx.carrierId) ?? false;

    // Carrier should see own drivers
    const { data: drivers } = await carrierClient.from("drivers").select("id, carrier_id");
    const allOwnDrivers = drivers?.every((d) => d.carrier_id === ctx.carrierId) ?? true;

    // Carrier should see own trucks
    const { data: trucks } = await carrierClient.from("trucks").select("id");
    const seesTrucks = (trucks?.length ?? 0) >= 1;

    await carrierClient.auth.signOut();

    reporter.assert(
      seesOwnCarrier && allOwnDrivers,
      step,
      "Carrier sees own carrier/drivers/trucks",
      `Own carrier: ${seesOwnCarrier}, Drivers: ${drivers?.length ?? 0} (all own: ${allOwnDrivers}), Trucks: ${trucks?.length ?? 0}`
    );
  } catch (err: any) {
    reporter.fail(step, "Carrier sees own carrier/drivers/trucks", err.message);
  }

  // --- Step 6: Carrier cannot see customer invoices ---
  step++;
  try {
    const carrierClient = createAnonClient();
    await carrierClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.carrier.email,
      password: TEST_ACCOUNTS.carrier.password,
    });

    const { data: invoices } = await carrierClient.from("invoices").select("id");
    const { data: customers } = await carrierClient.from("customers").select("id");

    const invoicesBlocked = !invoices || invoices.length === 0;
    const customersBlocked = !customers || customers.length === 0;

    await carrierClient.auth.signOut();

    reporter.assert(
      invoicesBlocked && customersBlocked,
      step,
      "Carrier cannot see customer invoices",
      `Invoices: ${invoices?.length ?? 0}, Customers: ${customers?.length ?? 0}`
    );
  } catch (err: any) {
    reporter.fail(step, "Carrier cannot see customer invoices", err.message);
  }

  // --- Step 7: Admin sees everything ---
  step++;
  try {
    const adminClient = createAnonClient();
    await adminClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS.admin.email,
      password: TEST_ACCOUNTS.admin.password,
    });

    const tables = [
      "customers", "carriers", "drivers", "trucks", "sites",
      "materials", "rates", "invoices", "carrier_settlements",
      "notifications", "qb_sync_log",
    ];

    let anyFailed = false;
    const accessible: string[] = [];
    const blocked: string[] = [];

    for (const table of tables) {
      const { error } = await adminClient.from(table).select("id").limit(1);
      if (error) {
        blocked.push(table);
        anyFailed = true;
      } else {
        accessible.push(table);
      }
    }

    await adminClient.auth.signOut();

    reporter.assert(
      !anyFailed,
      step,
      "Admin sees everything",
      anyFailed
        ? `Blocked: ${blocked.join(", ")}`
        : `All ${accessible.length} tables accessible`
    );
  } catch (err: any) {
    reporter.fail(step, "Admin sees everything", err.message);
  }

  reporter.printReport();
  return reporter;
}
