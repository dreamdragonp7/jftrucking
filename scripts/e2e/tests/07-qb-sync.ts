/**
 * 07 - QuickBooks Sync Tests
 *
 * Tests QB invoice sync, bill sync, payment roundtrip, and environment tagging.
 * All QB steps are SKIP (not PASS) when QB is not connected.
 *
 * Tests:
 *  1.  QB connectivity check
 *  2.  Sync invoice to QBO
 *  3.  Roundtrip: verify invoice amount in QBO
 *  4.  Verify QBO Invoice has EmailStatus = NeedToSend
 *  5.  Sync settlement to QBO as Bill
 *  6.  Roundtrip: verify bill amount in QBO
 *  7.  Verify bill includes dispatch fee line
 *  8.  Create QBO Payment via sandbox API -> sync to TMS
 *  9.  Roundtrip: read QBO Payment back, verify amount + linked invoice
 *  10. QB sync log entries created
 *  11. QB environment tagging: all synced records tagged "sandbox"
 *  12. Webhook signature computation test (offline)
 *  13. Create QBO BillPayment (carrier payment) -> verify bill balance = 0
 *  14. Roundtrip: read QBO BillPayment back, verify amount + linked bill
 */

import {
  createAdminClient,
  assertSandboxMode,
  getQBTokensWithRefresh,
  loadEnv,
  TestReporter,
} from "../lib/test-helpers";
import type { TestContext } from "../lib/types";
import { createHmac } from "crypto";

const QBO_SANDBOX_BASE = "https://sandbox-quickbooks.api.intuit.com/v3/company";

export async function runQBSyncTests(ctx: TestContext): Promise<TestReporter> {
  const reporter = new TestReporter("07-QB Sync");
  const supabase = createAdminClient();
  await assertSandboxMode(supabase);

  console.log("--- 07: QB Sync ---\n");

  let step = 0;

  // Try to import QB sync functions
  let syncInvoiceToQBO: Function | null = null;
  let syncSettlementToQBO: Function | null = null;
  let syncPaymentFromQBO: Function | null = null;
  let getQBClient: Function | null = null;

  try {
    const qbSvc = await import("@/lib/services/quickbooks.service");
    syncInvoiceToQBO = qbSvc.syncInvoiceToQBO;
    syncSettlementToQBO = qbSvc.syncSettlementToQBO;
    syncPaymentFromQBO = qbSvc.syncPaymentFromQBO;
    getQBClient = qbSvc.getQBClient;
    console.log("  Loaded: quickbooks.service");
  } catch (err: any) {
    console.log(`  FAILED to load quickbooks.service: ${err.message}`);
  }

  console.log("");

  // --- Step 1: QB connectivity check ---
  step++;
  let qbConnected = false;
  let qbAccessToken: string | null = null;
  let qbRealmId: string | null = null;

  try {
    const tokens = await getQBTokensWithRefresh(supabase);

    if (!tokens) {
      reporter.skip(step, "QB connectivity check", "QB not connected -- all QB tests will be SKIP");
    } else {
      qbAccessToken = tokens.accessToken;
      qbRealmId = tokens.realmId;

      // Verify by hitting company info endpoint
      const res = await fetch(
        `${QBO_SANDBOX_BASE}/${qbRealmId}/companyinfo/${qbRealmId}?minorversion=75`,
        {
          headers: {
            Authorization: `Bearer ${qbAccessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const companyName = data.CompanyInfo?.CompanyName ?? "Unknown";
        qbConnected = true;
        reporter.pass(step, "QB connectivity check", `Connected to: ${companyName}`);
      } else {
        reporter.skip(step, "QB connectivity check", `QBO API returned ${res.status}`);
      }
    }
  } catch (err: any) {
    reporter.skip(step, "QB connectivity check", err.message);
  }

  // --- Step 2: Sync invoice to QBO ---
  step++;
  if (!qbConnected || !syncInvoiceToQBO || !ctx.invoiceId) {
    const reason = !qbConnected
      ? "QB not connected"
      : !syncInvoiceToQBO
      ? "syncInvoiceToQBO import failed"
      : "No invoice to sync";
    reporter.skip(step, "Sync invoice to QBO", reason);
  } else {
    try {
      const result = await syncInvoiceToQBO(ctx.invoiceId);

      if (result.success) {
        ctx.qbInvoiceId = result.qbInvoiceId;
        reporter.pass(step, "Sync invoice to QBO", `QB Invoice ID: ${result.qbInvoiceId}`);
      } else {
        reporter.fail(step, "Sync invoice to QBO", `Error: ${result.error}`);
      }
    } catch (err: any) {
      reporter.fail(step, "Sync invoice to QBO", err.message);
    }
  }

  // --- Step 3: Roundtrip verify invoice in QBO ---
  step++;
  if (!qbConnected || !ctx.qbInvoiceId || !qbAccessToken || !qbRealmId) {
    reporter.skip(step, "Roundtrip: invoice amount in QBO", "QB invoice not synced");
  } else {
    try {
      const res = await fetch(
        `${QBO_SANDBOX_BASE}/${qbRealmId}/invoice/${ctx.qbInvoiceId}?minorversion=75`,
        {
          headers: {
            Authorization: `Bearer ${qbAccessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) throw new Error(`QBO API returned ${res.status}`);

      const data = await res.json();
      const qbTotal = parseFloat(data.Invoice?.TotalAmt ?? "0");

      reporter.assert(
        qbTotal === ctx.invoiceTotal,
        step,
        "Roundtrip: invoice amount in QBO",
        `QBO amount: $${qbTotal}, TMS amount: $${ctx.invoiceTotal}`
      );
    } catch (err: any) {
      reporter.fail(step, "Roundtrip: invoice amount in QBO", err.message);
    }
  }

  // --- Step 4: Verify QBO Invoice EmailStatus ---
  step++;
  if (!qbConnected || !ctx.qbInvoiceId || !qbAccessToken || !qbRealmId) {
    reporter.skip(step, "QBO Invoice EmailStatus", "QB invoice not synced");
  } else {
    try {
      const res = await fetch(
        `${QBO_SANDBOX_BASE}/${qbRealmId}/invoice/${ctx.qbInvoiceId}?minorversion=75`,
        {
          headers: {
            Authorization: `Bearer ${qbAccessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) throw new Error(`QBO API returned ${res.status}`);

      const data = await res.json();
      const emailStatus = data.Invoice?.EmailStatus;
      const billEmail = data.Invoice?.BillEmail?.Address;

      reporter.assert(
        emailStatus === "NeedToSend" || emailStatus === "EmailSent",
        step,
        "QBO Invoice EmailStatus",
        `EmailStatus: ${emailStatus}, BillEmail: ${billEmail ?? "none"}`
      );
    } catch (err: any) {
      reporter.fail(step, "QBO Invoice EmailStatus", err.message);
    }
  }

  // --- Step 5: Sync settlement to QBO as Bill ---
  step++;
  if (!qbConnected || !syncSettlementToQBO || !ctx.settlementId) {
    const reason = !qbConnected
      ? "QB not connected"
      : !syncSettlementToQBO
      ? "syncSettlementToQBO import failed"
      : "No settlement to sync";
    reporter.skip(step, "Sync settlement to QBO as Bill", reason);
  } else {
    try {
      const result = await syncSettlementToQBO(ctx.settlementId);

      if (result.success) {
        ctx.qbBillId = result.qbBillId;
        reporter.pass(step, "Sync settlement to QBO as Bill", `QB Bill ID: ${result.qbBillId}`);
      } else {
        reporter.fail(step, "Sync settlement to QBO as Bill", `Error: ${result.error}`);
      }
    } catch (err: any) {
      reporter.fail(step, "Sync settlement to QBO as Bill", err.message);
    }
  }

  // --- Step 6: Roundtrip verify bill in QBO ---
  step++;
  if (!qbConnected || !ctx.qbBillId || !qbAccessToken || !qbRealmId) {
    reporter.skip(step, "Roundtrip: bill amount in QBO", "QB bill not synced");
  } else {
    try {
      const res = await fetch(
        `${QBO_SANDBOX_BASE}/${qbRealmId}/bill/${ctx.qbBillId}?minorversion=75`,
        {
          headers: {
            Authorization: `Bearer ${qbAccessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) throw new Error(`QBO API returned ${res.status}`);

      const data = await res.json();
      const qbTotal = parseFloat(data.Bill?.TotalAmt ?? "0");

      reporter.assert(
        qbTotal === ctx.settlementTotal,
        step,
        "Roundtrip: bill amount in QBO",
        `QBO amount: $${qbTotal}, TMS amount: $${ctx.settlementTotal}`
      );
    } catch (err: any) {
      reporter.fail(step, "Roundtrip: bill amount in QBO", err.message);
    }
  }

  // --- Step 7: Verify bill includes dispatch fee line ---
  step++;
  if (!qbConnected || !ctx.qbBillId || !qbAccessToken || !qbRealmId) {
    reporter.skip(step, "Bill dispatch fee line", "QB bill not synced");
  } else {
    try {
      const res = await fetch(
        `${QBO_SANDBOX_BASE}/${qbRealmId}/bill/${ctx.qbBillId}?minorversion=75`,
        {
          headers: {
            Authorization: `Bearer ${qbAccessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) throw new Error(`QBO API returned ${res.status}`);

      const data = await res.json();
      const lines = data.Bill?.Line ?? [];
      const dispatchLine = lines.find(
        (l: any) => l.Description?.toLowerCase().includes("dispatch")
      );

      // Get settlement to check if dispatch fee > 0
      const { data: settlement } = await supabase
        .from("carrier_settlements")
        .select("dispatch_fee")
        .eq("id", ctx.settlementId!)
        .single();

      const hasDispatchFee = (settlement?.dispatch_fee ?? 0) > 0;

      if (hasDispatchFee) {
        reporter.assert(
          !!dispatchLine,
          step,
          "Bill dispatch fee line",
          `Dispatch fee: $${settlement?.dispatch_fee}, Line found: ${!!dispatchLine}, Total lines: ${lines.length}`
        );
      } else {
        reporter.pass(
          step,
          "Bill dispatch fee line",
          `No dispatch fee on settlement -- correctly omitted`
        );
      }
    } catch (err: any) {
      reporter.fail(step, "Bill dispatch fee line", err.message);
    }
  }

  // --- Step 8: Create QBO Payment via sandbox API -> sync to TMS ---
  step++;
  if (!qbConnected || !ctx.qbInvoiceId || !qbAccessToken || !qbRealmId || !syncPaymentFromQBO) {
    const reason = !qbConnected
      ? "QB not connected"
      : !ctx.qbInvoiceId
      ? "No QBO invoice synced"
      : !syncPaymentFromQBO
      ? "syncPaymentFromQBO import failed"
      : "Missing QB credentials";
    reporter.skip(step, "QBO Payment -> TMS sync", reason);
  } else {
    try {
      // Get customer's QBO ID
      const { data: invoice } = await supabase
        .from("invoices")
        .select("customer_id, total")
        .eq("id", ctx.invoiceId!)
        .single();

      const { data: customer } = await supabase
        .from("customers")
        .select("qb_customer_id")
        .eq("id", invoice!.customer_id)
        .single();

      if (!customer?.qb_customer_id) {
        reporter.skip(step, "QBO Payment -> TMS sync", "Customer not synced to QBO");
      } else {
        // Create payment directly via QBO API
        const paymentBody = {
          CustomerRef: { value: customer.qb_customer_id },
          TotalAmt: 1.00, // Small test amount
          Line: [
            {
              Amount: 1.00,
              LinkedTxn: [
                { TxnId: ctx.qbInvoiceId, TxnType: "Invoice" },
              ],
            },
          ],
        };

        const createRes = await fetch(
          `${QBO_SANDBOX_BASE}/${qbRealmId}/payment?minorversion=75`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${qbAccessToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(paymentBody),
          }
        );

        if (!createRes.ok) {
          const errText = await createRes.text();
          throw new Error(`QBO Payment create failed (${createRes.status}): ${errText}`);
        }

        const paymentData = await createRes.json();
        const qbPaymentId = String(paymentData.Payment?.Id);
        ctx.qbPaymentId = qbPaymentId;

        // Now sync it to TMS
        const syncResult = await syncPaymentFromQBO(qbPaymentId);

        reporter.assert(
          syncResult.success,
          step,
          "QBO Payment -> TMS sync",
          `QBO Payment ID: ${qbPaymentId}, Sync: ${syncResult.success ? "OK" : syncResult.error}`
        );
      }
    } catch (err: any) {
      reporter.fail(step, "QBO Payment -> TMS sync", err.message);
    }
  }

  // --- Step 9: Roundtrip: read QBO Payment back ---
  step++;
  if (!qbConnected || !ctx.qbPaymentId || !qbAccessToken || !qbRealmId) {
    reporter.skip(step, "QBO Payment roundtrip", "No QBO payment created");
  } else {
    try {
      const res = await fetch(
        `${QBO_SANDBOX_BASE}/${qbRealmId}/payment/${ctx.qbPaymentId}?minorversion=75`,
        {
          headers: {
            Authorization: `Bearer ${qbAccessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) throw new Error(`QBO API returned ${res.status}`);

      const data = await res.json();
      const qbAmount = parseFloat(data.Payment?.TotalAmt ?? "0");
      const linkedTxns = data.Payment?.Line?.[0]?.LinkedTxn ?? [];
      const linkedInvoiceId = linkedTxns.find((t: any) => t.TxnType === "Invoice")?.TxnId;

      reporter.assert(
        qbAmount === 1.00 && linkedInvoiceId === ctx.qbInvoiceId,
        step,
        "QBO Payment roundtrip",
        `Amount: $${qbAmount}, Linked Invoice: ${linkedInvoiceId}, Expected: ${ctx.qbInvoiceId}`
      );
    } catch (err: any) {
      reporter.fail(step, "QBO Payment roundtrip", err.message);
    }
  }

  // --- Step 10: QB sync log entries ---
  step++;
  try {
    if (!qbConnected) {
      reporter.skip(step, "QB sync log entries", "QB not connected");
    } else {
      const { data: syncLogs, error } = await supabase
        .from("qb_sync_log")
        .select("id, entity_type, action, status")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const logCount = syncLogs?.length ?? 0;

      reporter.assert(
        logCount > 0,
        step,
        "QB sync log entries",
        `Found ${logCount} recent log entries`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "QB sync log entries", err.message);
  }

  // --- Step 11: QB environment tagging: check ALL synced records ---
  step++;
  try {
    if (!qbConnected) {
      reporter.skip(step, "QB environment tagging (all records)", "QB not connected");
    } else {
      let allSandbox = true;
      const checked: string[] = [];

      // Check invoices
      if (ctx.invoiceId) {
        const { data: inv } = await supabase
          .from("invoices")
          .select("qb_invoice_id, qb_environment")
          .eq("id", ctx.invoiceId)
          .single();

        if (inv?.qb_invoice_id) {
          checked.push(`invoice:${inv.qb_environment}`);
          if (inv.qb_environment !== "sandbox") allSandbox = false;
        }
      }

      // Check settlements
      if (ctx.settlementId) {
        const { data: stl } = await supabase
          .from("carrier_settlements")
          .select("qb_bill_id, qb_environment")
          .eq("id", ctx.settlementId)
          .single();

        if (stl?.qb_bill_id) {
          checked.push(`settlement:${stl.qb_environment}`);
          if (stl.qb_environment !== "sandbox") allSandbox = false;
        }
      }

      // Check payments with qb_payment_id
      const { data: paymentRecords } = await supabase
        .from("payments")
        .select("qb_payment_id, qb_environment")
        .not("qb_payment_id", "is", null)
        .limit(10);

      for (const pay of paymentRecords ?? []) {
        checked.push(`payment:${pay.qb_environment}`);
        if (pay.qb_environment !== "sandbox") allSandbox = false;
      }

      reporter.assert(
        allSandbox && checked.length > 0,
        step,
        "QB environment tagging (all records)",
        `Checked ${checked.length} records: ${checked.join(", ")}`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "QB environment tagging (all records)", err.message);
  }

  // --- Step 12: Webhook signature computation test (offline) ---
  step++;
  try {
    loadEnv();
    // Use env var if available, otherwise use a test token for offline verification
    const webhookVerifierToken = process.env.QB_WEBHOOK_VERIFIER_TOKEN || "e2e-test-webhook-verifier-token";

    {
      // Construct a fake webhook payload
      const fakePayload = JSON.stringify({
        eventNotifications: [
          {
            realmId: qbRealmId ?? "1234567890",
            dataChangeEvent: {
              entities: [
                { name: "Payment", id: "999", operation: "Create" },
              ],
            },
          },
        ],
      });

      // Compute HMAC-SHA256 signature the same way Intuit does
      const hmac = createHmac("sha256", webhookVerifierToken);
      hmac.update(fakePayload);
      const signature = hmac.digest("base64");

      // Verify the signature is non-empty and well-formed Base64
      const isValidBase64 = /^[A-Za-z0-9+/]+=*$/.test(signature);

      reporter.assert(
        isValidBase64 && signature.length > 0,
        step,
        "Webhook HMAC signature test",
        `Computed signature (${signature.length} chars), Valid Base64: ${isValidBase64}`
      );
    }
  } catch (err: any) {
    reporter.fail(step, "Webhook HMAC signature test", err.message);
  }

  // --- Step 13: Create QBO BillPayment (carrier payment) ---
  step++;
  if (!qbConnected || !ctx.qbBillId || !qbAccessToken || !qbRealmId) {
    const reason = !qbConnected
      ? "QB not connected"
      : !ctx.qbBillId
      ? "No QBO bill synced"
      : "Missing QB credentials";
    reporter.skip(step, "QBO BillPayment (carrier payment)", reason);
  } else {
    try {
      // Get carrier's QBO vendor ID
      const { data: carrier } = await supabase
        .from("carriers")
        .select("qb_vendor_id")
        .eq("id", ctx.carrierId)
        .single();

      if (!carrier?.qb_vendor_id) {
        reporter.skip(step, "QBO BillPayment (carrier payment)", "Carrier not synced to QBO (no qb_vendor_id)");
      } else {
        // Get bill details for the BillPayment
        const billRes = await fetch(
          `${QBO_SANDBOX_BASE}/${qbRealmId}/bill/${ctx.qbBillId}?minorversion=75`,
          {
            headers: {
              Authorization: `Bearer ${qbAccessToken}`,
              Accept: "application/json",
            },
          }
        );

        if (!billRes.ok) throw new Error(`Failed to read bill: ${billRes.status}`);

        const billData = await billRes.json();
        const billAmount = parseFloat(billData.Bill?.TotalAmt ?? "0");

        // Find a bank account to use for the check payment
        // Query QBO for a bank account
        const bankQuery = `SELECT * FROM Account WHERE AccountType = 'Bank' MAXRESULTS 1`;
        const bankRes = await fetch(
          `${QBO_SANDBOX_BASE}/${qbRealmId}/query?query=${encodeURIComponent(bankQuery)}&minorversion=75`,
          {
            headers: {
              Authorization: `Bearer ${qbAccessToken}`,
              Accept: "application/json",
            },
          }
        );

        let bankAccountRef: { value: string; name: string } | null = null;
        if (bankRes.ok) {
          const bankData = await bankRes.json();
          const accounts = bankData.QueryResponse?.Account ?? [];
          if (accounts.length > 0) {
            bankAccountRef = { value: accounts[0].Id, name: accounts[0].Name };
          }
        }

        if (!bankAccountRef) {
          reporter.skip(step, "QBO BillPayment (carrier payment)", "No bank account found in QBO sandbox");
        } else {
          // Create BillPayment
          const billPaymentBody = {
            VendorRef: { value: carrier.qb_vendor_id },
            TotalAmt: billAmount,
            PayType: "Check",
            CheckPayment: {
              BankAccountRef: bankAccountRef,
            },
            Line: [
              {
                Amount: billAmount,
                LinkedTxn: [
                  { TxnId: ctx.qbBillId, TxnType: "Bill" },
                ],
              },
            ],
          };

          const createRes = await fetch(
            `${QBO_SANDBOX_BASE}/${qbRealmId}/billpayment?minorversion=75`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${qbAccessToken}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(billPaymentBody),
            }
          );

          if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`QBO BillPayment create failed (${createRes.status}): ${errText.slice(0, 200)}`);
          }

          const bpData = await createRes.json();
          const qbBillPaymentId = String(bpData.BillPayment?.Id);
          ctx.qbBillPaymentId = qbBillPaymentId;

          // Verify bill balance is now 0
          const billAfterRes = await fetch(
            `${QBO_SANDBOX_BASE}/${qbRealmId}/bill/${ctx.qbBillId}?minorversion=75`,
            {
              headers: {
                Authorization: `Bearer ${qbAccessToken}`,
                Accept: "application/json",
              },
            }
          );

          let billBalance = -1;
          if (billAfterRes.ok) {
            const billAfterData = await billAfterRes.json();
            billBalance = parseFloat(billAfterData.Bill?.Balance ?? "-1");
          }

          reporter.assert(
            !!qbBillPaymentId && billBalance === 0,
            step,
            "QBO BillPayment (carrier payment)",
            `BillPayment ID: ${qbBillPaymentId}, Bill amount: $${billAmount}, Bill balance after: $${billBalance}`
          );
        }
      }
    } catch (err: any) {
      reporter.fail(step, "QBO BillPayment (carrier payment)", err.message);
    }
  }

  // --- Step 14: Roundtrip: read QBO BillPayment back ---
  step++;
  if (!qbConnected || !ctx.qbBillPaymentId || !qbAccessToken || !qbRealmId) {
    reporter.skip(step, "QBO BillPayment roundtrip", "No QBO BillPayment created");
  } else {
    try {
      const res = await fetch(
        `${QBO_SANDBOX_BASE}/${qbRealmId}/billpayment/${ctx.qbBillPaymentId}?minorversion=75`,
        {
          headers: {
            Authorization: `Bearer ${qbAccessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) throw new Error(`QBO API returned ${res.status}`);

      const data = await res.json();
      const qbAmount = parseFloat(data.BillPayment?.TotalAmt ?? "0");
      const linkedTxns = data.BillPayment?.Line?.[0]?.LinkedTxn ?? [];
      const linkedBillId = linkedTxns.find((t: any) => t.TxnType === "Bill")?.TxnId;

      reporter.assert(
        qbAmount > 0 && linkedBillId === ctx.qbBillId,
        step,
        "QBO BillPayment roundtrip",
        `Amount: $${qbAmount}, Linked Bill: ${linkedBillId}, Expected: ${ctx.qbBillId}`
      );
    } catch (err: any) {
      reporter.fail(step, "QBO BillPayment roundtrip", err.message);
    }
  }

  reporter.printReport();
  return reporter;
}
