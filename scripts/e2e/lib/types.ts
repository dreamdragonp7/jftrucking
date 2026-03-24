/**
 * Shared context type passed between test files via the orchestrator.
 */
export interface TestContext {
  // Entity IDs from seed
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

  // Workflow IDs created during tests (populated by 04-workflow.ts)
  poId?: string;
  dispatchIds?: string[];
  deliveryIds?: string[];
  confirmedDeliveryIds?: string[];
  disputedDeliveryId?: string;

  // Financial IDs created during tests (populated by 06-financials.ts)
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceTotal?: number;
  invoice2Id?: string;
  invoice2Total?: number;
  settlementId?: string;
  settlementNumber?: string;
  settlementTotal?: number;
  paymentId?: string;
  payment2Id?: string;

  // Payment test context (populated by 06-financials, 08-notifications, 10-edge-cases)
  qbPaymentId?: string;
  partialInvoiceId?: string;

  // Settlement payment context (populated by 06-financials, 07-qb-sync)
  settlementApproved?: boolean;
  qbBillPaymentId?: string;

  // Cron test context (populated by 11-cron-jobs)
  cronInvoiceId?: string;
  cronSettlementId?: string;

  // Second customer context
  customer2AccountId?: string;

  // QB IDs (populated by 07-qb-sync.ts)
  qbInvoiceId?: string;
  qbBillId?: string;
}
