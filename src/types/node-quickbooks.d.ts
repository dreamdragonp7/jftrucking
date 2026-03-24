/**
 * Type declarations for node-quickbooks package.
 * The package does not ship its own TypeScript types.
 */
declare module "node-quickbooks" {
  type Callback = (err: unknown, result: unknown) => void;

  interface QueryCriteria {
    field: string;
    value: string;
    operator?: string;
  }

  class QuickBooks {
    constructor(
      consumerKey: string,
      consumerSecret: string,
      token: string,
      tokenSecret: boolean | string,
      realmId: string,
      useSandbox?: boolean,
      debug?: boolean,
      minorversion?: number | null,
      oauthversion?: string,
      refreshToken?: string
    );

    // Invoice
    createInvoice(invoice: Record<string, unknown>, callback: Callback): void;
    getInvoice(id: string, callback: Callback): void;
    updateInvoice(invoice: Record<string, unknown>, callback: Callback): void;
    deleteInvoice(idOrEntity: string | Record<string, unknown>, callback: Callback): void;
    findInvoices(criteria: QueryCriteria[], callback: Callback): void;
    sendInvoicePdf(id: string, sendTo: string, callback: Callback): void;

    // Customer
    createCustomer(customer: Record<string, unknown>, callback: Callback): void;
    getCustomer(id: string, callback: Callback): void;
    updateCustomer(customer: Record<string, unknown>, callback: Callback): void;
    findCustomers(criteria: QueryCriteria[], callback: Callback): void;

    // Vendor
    createVendor(vendor: Record<string, unknown>, callback: Callback): void;
    getVendor(id: string, callback: Callback): void;
    updateVendor(vendor: Record<string, unknown>, callback: Callback): void;
    findVendors(criteria: QueryCriteria[], callback: Callback): void;

    // Item
    createItem(item: Record<string, unknown>, callback: Callback): void;
    getItem(id: string, callback: Callback): void;
    updateItem(item: Record<string, unknown>, callback: Callback): void;
    findItems(criteria: QueryCriteria[], callback: Callback): void;

    // Bill
    createBill(bill: Record<string, unknown>, callback: Callback): void;
    getBill(id: string, callback: Callback): void;
    updateBill(bill: Record<string, unknown>, callback: Callback): void;
    findBills(criteria: QueryCriteria[], callback: Callback): void;

    // BillPayment
    createBillPayment(payment: Record<string, unknown>, callback: Callback): void;
    getBillPayment(id: string, callback: Callback): void;

    // Payment
    createPayment(payment: Record<string, unknown>, callback: Callback): void;
    getPayment(id: string, callback: Callback): void;
    findPayments(criteria: QueryCriteria[], callback: Callback): void;

    // Attachable
    createAttachable(attachable: Record<string, unknown>, callback: Callback): void;
    upload(filename: string, contentType: string, stream: unknown, entityType: string, entityId: string, callback: Callback): void;

    // Company
    getCompanyInfo(id: string, callback: Callback): void;

    // Reports
    reportProfitAndLoss(options: Record<string, string>, callback: Callback): void;
    reportBalanceSheet(options: Record<string, string>, callback: Callback): void;

    // CDC
    changeDataCapture(entities: string[], since: string, callback: Callback): void;

    // Batch
    batch(items: unknown[], callback: Callback): void;
  }

  export default QuickBooks;
}
