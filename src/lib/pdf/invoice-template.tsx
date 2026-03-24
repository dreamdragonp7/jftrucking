import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
  Font,
} from "@react-pdf/renderer";
import { JFT_COMPANY } from "@/lib/constants/company";
import type { InvoiceWithDetails } from "@/types/database";

// ---------------------------------------------------------------------------
// Font registration — Helvetica is built-in; we don't need external fonts
// ---------------------------------------------------------------------------

// react-pdf has Helvetica and Courier built-in. We use Courier for mono numbers.

// ---------------------------------------------------------------------------
// Color constants matching JFT brand
// ---------------------------------------------------------------------------

const COLORS = {
  deepBrown: "#4C1C06",
  gold: "#EDBC18",
  black: "#1A1A1A",
  darkGray: "#333333",
  mediumGray: "#666666",
  lightGray: "#999999",
  borderGray: "#E0E0E0",
  bgLight: "#FAFAFA",
  white: "#FFFFFF",
} as const;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLORS.darkGray,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: COLORS.white,
  },

  // Header section
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: "column",
    gap: 4,
    maxWidth: "55%",
  },
  logoContainer: {
    marginBottom: 6,
  },
  companyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLORS.deepBrown,
    marginTop: 4,
  },
  companyDetail: {
    fontSize: 8,
    color: COLORS.mediumGray,
    lineHeight: 1.5,
  },
  headerRight: {
    alignItems: "flex-end",
    flexDirection: "column",
    gap: 3,
  },
  invoiceTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 28,
    color: COLORS.deepBrown,
    letterSpacing: 2,
    marginBottom: 8,
  },
  invoiceMetaRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  invoiceMetaLabel: {
    fontSize: 8,
    color: COLORS.lightGray,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    width: 70,
    textAlign: "right",
  },
  invoiceMetaValue: {
    fontFamily: "Courier",
    fontSize: 9,
    color: COLORS.black,
    width: 100,
    textAlign: "right",
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
    marginVertical: 16,
  },
  dividerBold: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.deepBrown,
    marginVertical: 16,
  },

  // Bill To section
  billToSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  billToBlock: {
    maxWidth: "60%",
  },
  billToLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLORS.deepBrown,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 6,
  },
  billToName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLORS.black,
    marginBottom: 2,
  },
  billToAddress: {
    fontSize: 9,
    color: COLORS.mediumGray,
    lineHeight: 1.5,
  },
  poRef: {
    maxWidth: "35%",
  },
  poRefLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLORS.deepBrown,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 6,
  },
  poRefValue: {
    fontFamily: "Courier",
    fontSize: 9,
    color: COLORS.black,
    lineHeight: 1.6,
  },

  // Table
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.deepBrown,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 3,
  },
  tableHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLORS.white,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
  },
  tableRowAlt: {
    backgroundColor: COLORS.bgLight,
  },
  colDate: {
    flex: 0.8,
  },
  colQty: {
    flex: 0.8,
    textAlign: "right",
  },
  colMaterial: {
    flex: 1.5,
  },
  colAddress: {
    flex: 2,
  },
  colRate: {
    flex: 1,
    textAlign: "right",
  },
  colAmount: {
    flex: 1.2,
    textAlign: "right",
  },
  cellText: {
    fontSize: 9,
    color: COLORS.darkGray,
  },
  cellMono: {
    fontFamily: "Courier",
    fontSize: 9,
    color: COLORS.black,
  },
  cellSubtext: {
    fontSize: 7.5,
    color: COLORS.lightGray,
    marginTop: 2,
  },
  cellDescription: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: COLORS.black,
  },

  // Totals
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  totalsBox: {
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  totalsLabel: {
    fontSize: 9,
    color: COLORS.mediumGray,
  },
  totalsValue: {
    fontFamily: "Courier",
    fontSize: 9,
    color: COLORS.black,
  },
  totalsFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.deepBrown,
    borderRadius: 3,
    marginTop: 4,
  },
  totalsFinalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLORS.white,
  },
  totalsFinalValue: {
    fontFamily: "Courier-Bold",
    fontSize: 11,
    color: COLORS.gold,
  },

  // Payment terms
  paymentSection: {
    marginTop: 24,
    padding: 12,
    backgroundColor: COLORS.bgLight,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold,
  },
  paymentTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLORS.deepBrown,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 6,
  },
  paymentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 3,
  },
  paymentLabel: {
    fontSize: 8,
    color: COLORS.lightGray,
    width: 100,
  },
  paymentValue: {
    fontSize: 8,
    color: COLORS.darkGray,
    fontFamily: "Helvetica-Bold",
  },

  // Thank you
  thankYou: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 10,
    color: COLORS.mediumGray,
    fontStyle: "italic",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: COLORS.lightGray,
  },
  footerBrand: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: COLORS.deepBrown,
  },

  // Tax note
  taxNote: {
    marginTop: 12,
    fontSize: 7.5,
    color: COLORS.lightGray,
    fontStyle: "italic",
    textAlign: "center",
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatPaymentTerms(terms: string): string {
  const map: Record<string, string> = {
    net_15: "Net 15",
    net_30: "Net 30",
    net_45: "Net 45",
    net_60: "Net 60",
  };
  return map[terms] ?? "Net 15";
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  return `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// JFT Logo SVG Component for PDF — simplified buck/antlers mark
// ---------------------------------------------------------------------------

function JFTLogo() {
  return (
    <Svg width={60} height={60} viewBox="0 0 200 200">
      {/* Main body - deep brown */}
      <Path
        d="m166.8 123.2-39.15-4.29c6.51-9.82 9.51-21.02 10.03-33.52-9.38 0.95-19.65 4.46-20.95 13.58-0.52 3.81-0.72 7.41-3.62 11.44-3.03 4.31-4.24 6.87-4.95 11.75-0.94 5.47-4.76 8.55-9.25 8.44-4.49 0.11-8.31-2.26-9.07-8.44-0.71-5.5-2.62-8.61-4.69-11.48-2.41-3.16-2.64-5.94-2.9-10.56-0.71-8.85-8.58-12.21-20.4-13.78 0.39 11.6 3.02 22.31 10.56 32.57l-38.21 3.9c0.35 6.99-3.75 11.71-10.95 13.33v39.54h2.44c6.23 0 9.38 2.99 9.21 7.78l43.98 6.61c9.03 1.42 17.12 3.98 20.83 7.93 3.71-3.55 10.67-5.93 20.83-7.62l45.17-6.55c-0.41-4.9 3.16-8.02 10.47-8.02v-39.61c-6.28-1.29-9.9-6.24-9.38-13z"
        fill="#4C1C06"
      />
      {/* Antlers - gold */}
      <Path
        d="m180.4 44.32c-1.12-0.95-1.84-0.48-1.07 1.29 3.47 7.95-0.1 14.88-9.18 21.11-4.27 3.04-11.12 4.57-14.72 4.9-2.19 0.21-2.06-1.37-1.32-3.32 3.05-7.33 8.02-14.45 15.17-20.98 8.92-8.35 11.99-16.34 9.66-34.62-0.54-2.67-2.45-2.62-2.13-0.37 2 12.49-2.03 22.01-12.48 30.74-1.09 0.89-1.52 0.11-1.33-1.42 2.2-13.38-0.26-26.77-4.76-38.63-0.71-1.61-1.68-1.01-1.08 1.29 2.87 10.75 2.35 22.88-0.52 34.15-0.53 1.98-1.37 1.12-2.13-0.29-3.91-5.4-7.91-9.5-13.43-12.44-1.65-0.91-2.41 0.4-1.07 2.07 8.75 10.11 12.77 16.12 10.72 27.86-2.23 9.15-8.76 17.18-16.59 20.04-1.49 0.54-1.9 0.07-0.81-3.29 2.1-6.23 1.23-11.78-0.33-20.84-0.42-1.46-1.44-1.03-1.36 0.49 0.05 10.86-5.41 23.83-16.63 29.96-4.95 2.41-6.88 7.43-15.32 7.43-6.85 0-10.06-4.36-12.55-5.94-9.33-3.77-16.87-13.38-18.34-25.31-0.27-2.17-0.07-3.49-0.16-6.05-0.06-1.48-1.27-1.61-1.57-0.09-1.91 8.26-1.97 14.66 0.77 21.78 0.89 2.82 0.19 2.65-1.73 1.86-8.22-3.15-15.47-12.29-17.88-20.28-2.01-10.71 3.6-18.44 9.98-27.45 1.49-2.24 1.3-3.61-0.52-2.49-5.7 3.36-10.39 8.51-13.53 13.66-0.82 1.34-1.94 1.3-2.46-0.85-3.02-10.58-1.94-21.64 0.66-34.61 0.37-2.07-1.43-1.98-1.83-0.17-3.89 12.45-4.8 24.37-3.02 34.78 0.42 2.32-1.25 3.89-2.77 2.45-9.9-7.48-12.1-15.01-11.62-27.35 0.08-1.91-1.44-1.57-2.01 0.41-4.58 12.38-1.05 23.01 7.87 31.45 7.58 7.07 13.24 13.34 17.32 23.36 1.34 3.31 1.43 3.6-1.55 3.12-13.16-2.26-23.84-7.29-26.25-16.18-0.97-3.81-0.13-7.18 1.51-9.69 1.22-2.02 0.05-2.93-1.18-1.54-4.05 3.96-5.03 9.41-3.22 14.72 3.63 9.74 12.02 15.24 24.37 19.73 2.82 1.06 3.19 1.96 1.46 2.44-3.57 1.06-4.09 6.51-1.59 9.02 2.28 2.42 7.37 2.08 9.78-0.57 0.76-0.85 0-1.1-0.93-0.72-2.41 1.04-3.6-1.52-2.16-3.04 1.61-1.77 3.8-2.44 9.54-2.39 12.22 0.09 27.63 4.21 28.6 16.21 0.31 3.99 0.43 6.2 2.66 9.29 2.69 3.85 4.5 7.98 5.07 12.81 0.53 4.73 3.35 6.21 6.53 6.09 3.19 0.12 6.29-2.2 7-6.77 0.71-5.67 2.89-9.47 5.81-13.5 2.1-2.82 2.18-6.37 3.17-10.83 2.82-10.3 14.82-12.55 23.16-13.17 7-0.38 10.76-0.77 13.95 1.32 2 1.23 1.79 3.7-0.8 3.95-1.12 0.12-2.15-0.93-2.42 0.07 0.93 1.85 4.03 2.85 7.22 2.73 4.27-0.17 4.98-4.54 3.63-7.05-0.94-1.9-1.83-2.24-2.92-3.04-0.88-0.72-0.36-1.29 2.09-2.52 5.6-2.38 10.1-3.82 17.05-11.48 4.95-5.31 7.5-9.55 8.47-13.64 0.38-3.81-0.97-7.26-3.95-9.66z"
        fill="#EDBC18"
      />
      {/* Face - deep brown */}
      <Path
        d="m99.26 73.76c-5.38 3.03-9.88 4.84-14.25 5.85 2.77 0.76 4.51 2.45 6.11 4.02 2.68 2.25 5.83 3.05 8.51 3.05 3.67 0 6.72-1.57 9.59-4.26 1.6-1.52 3.41-2.43 5.32-3.06-5.46-1.15-10.52-2.96-15.28-5.6z"
        fill="#4C1C06"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// InvoicePDF component
// ---------------------------------------------------------------------------

interface InvoicePDFProps {
  invoice: InvoiceWithDetails;
}

export function InvoicePDF({ invoice }: InvoicePDFProps) {
  const customer = invoice.customer;
  const lineItems = invoice.line_items ?? [];

  // Extract unique PO numbers
  const poNumbers = [
    ...new Set(
      lineItems
        .map((li) => {
          const po = li.purchase_order as { po_number: string } | null;
          return po?.po_number;
        })
        .filter(Boolean)
    ),
  ];

  return (
    <Document
      title={`Invoice ${invoice.invoice_number}`}
      author={JFT_COMPANY.name}
      subject={`Invoice for ${customer.name}`}
    >
      <Page size="LETTER" style={styles.page}>
        {/* PAID watermark for paid invoices */}
        {invoice.status === "paid" && (
          <Text
            style={{
              position: "absolute",
              top: "40%",
              left: "15%",
              fontSize: 80,
              fontFamily: "Helvetica-Bold",
              color: COLORS.deepBrown,
              opacity: 0.08,
              transform: "rotate(-35deg)",
              letterSpacing: 12,
            }}
          >
            PAID
          </Text>
        )}
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <JFTLogo />
            </View>
            <Text style={styles.companyName}>{JFT_COMPANY.name}</Text>
            <Text style={styles.companyDetail}>{JFT_COMPANY.address}</Text>
            <Text style={styles.companyDetail}>
              {JFT_COMPANY.city}, {JFT_COMPANY.state} {JFT_COMPANY.zip}
            </Text>
            <Text style={styles.companyDetail}>{JFT_COMPANY.phone}</Text>
            <Text style={styles.companyDetail}>{JFT_COMPANY.email}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.invoiceMetaRow}>
              <Text style={styles.invoiceMetaLabel}>Invoice #</Text>
              <Text style={styles.invoiceMetaValue}>
                {invoice.invoice_number}
              </Text>
            </View>
            <View style={styles.invoiceMetaRow}>
              <Text style={styles.invoiceMetaLabel}>Date</Text>
              <Text style={styles.invoiceMetaValue}>
                {formatDate(invoice.created_at.split("T")[0])}
              </Text>
            </View>
            <View style={styles.invoiceMetaRow}>
              <Text style={styles.invoiceMetaLabel}>Due Date</Text>
              <Text style={styles.invoiceMetaValue}>
                {formatDate(invoice.due_date)}
              </Text>
            </View>
            <View style={styles.invoiceMetaRow}>
              <Text style={styles.invoiceMetaLabel}>Period</Text>
              <Text style={styles.invoiceMetaValue}>
                {formatDate(invoice.period_start)} {"\u2013"}{" "}
                {formatDate(invoice.period_end)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.dividerBold} />

        {/* ── BILL TO ─────────────────────────────────────────────── */}
        <View style={styles.billToSection}>
          <View style={styles.billToBlock}>
            <Text style={styles.billToLabel}>Bill To</Text>
            <Text style={styles.billToName}>{customer.name}</Text>
            {customer.billing_address && (
              <Text style={styles.billToAddress}>
                {customer.billing_address}
              </Text>
            )}
            {customer.billing_email && (
              <Text style={styles.billToAddress}>
                {customer.billing_email}
              </Text>
            )}
            {customer.phone && (
              <Text style={styles.billToAddress}>{customer.phone}</Text>
            )}
          </View>
          {poNumbers.length > 0 && (
            <View style={styles.poRef}>
              <Text style={styles.poRefLabel}>Purchase Order(s)</Text>
              {poNumbers.map((po) => (
                <Text key={po} style={[styles.poRefValue, { fontFamily: "Helvetica-Bold", fontSize: 11 }]}>
                  PO #{po}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* ── LINE ITEMS TABLE ────────────────────────────────────── */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <View style={styles.colDate}>
              <Text style={styles.tableHeaderText}>Date</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>
                Qty
              </Text>
            </View>
            <View style={styles.colMaterial}>
              <Text style={styles.tableHeaderText}>Material</Text>
            </View>
            <View style={styles.colAddress}>
              <Text style={styles.tableHeaderText}>Address</Text>
            </View>
            <View style={styles.colRate}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>
                Rate
              </Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>
                Amount
              </Text>
            </View>
          </View>

          {/* Table rows */}
          {lineItems.map((item, index) => {
            const material = item.material as { name: string; unit_of_measure: string } | null;
            const po = item.purchase_order as { po_number: string } | null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const itemAny = item as any;
            const unitLabel = itemAny.unit === "loads" ? "loads" : itemAny.unit === "tons" ? "tons" : material?.unit_of_measure === "ton" ? "tons" : itemAny.unit ?? "loads";
            const unitSingular = unitLabel === "loads" ? "load" : unitLabel === "tons" ? "ton" : "unit";

            // delivery_date, delivery_address, cost_code added by Agent 3
            const deliveryDate: string | null = itemAny.delivery_date ?? null;
            const deliveryAddress: string | null = itemAny.delivery_address ?? null;
            const costCode: string | null = itemAny.cost_code ?? null;
            const materialName = material?.name ?? "Hauling Services";

            return (
              <View
                key={item.id}
                style={[
                  styles.tableRow,
                  index % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <View style={styles.colDate}>
                  <Text style={styles.cellText}>
                    {deliveryDate ? formatDateShort(deliveryDate) : "--"}
                  </Text>
                </View>
                <View style={styles.colQty}>
                  <Text style={styles.cellMono}>
                    {item.quantity.toLocaleString("en-US", {
                      minimumFractionDigits: unitLabel === "tons" ? 1 : 0,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <Text style={styles.cellSubtext}>{unitLabel}</Text>
                </View>
                <View style={styles.colMaterial}>
                  <Text style={styles.cellDescription}>
                    {materialName}
                  </Text>
                  {costCode && (
                    <Text style={styles.cellSubtext}>
                      Code: {costCode}
                    </Text>
                  )}
                  {po && (
                    <Text style={styles.cellSubtext}>
                      PO #{po.po_number}
                    </Text>
                  )}
                </View>
                <View style={styles.colAddress}>
                  <Text style={styles.cellText}>
                    {deliveryAddress ?? "--"}
                  </Text>
                </View>
                <View style={styles.colRate}>
                  <Text style={styles.cellMono}>
                    {formatMoney(item.rate)}
                  </Text>
                  <Text style={styles.cellSubtext}>/{unitSingular}</Text>
                </View>
                <View style={styles.colAmount}>
                  <Text style={styles.cellMono}>
                    {formatMoney(item.amount)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── TOTALS ──────────────────────────────────────────────── */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>
                {formatMoney(invoice.subtotal)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>
                Tax (Hauling Services — Exempt)
              </Text>
              <Text style={styles.totalsValue}>{formatMoney(0)}</Text>
            </View>
            <View style={styles.totalsFinalRow}>
              <Text style={styles.totalsFinalLabel}>TOTAL DUE</Text>
              <Text style={styles.totalsFinalValue}>
                {formatMoney(invoice.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── PAYMENT TERMS ───────────────────────────────────────── */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Information</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Terms:</Text>
            <Text style={styles.paymentValue}>
              {formatPaymentTerms(customer.payment_terms)}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method:</Text>
            <Text style={styles.paymentValue}>ACH Bank Transfer / Check</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Due Date:</Text>
            <Text style={styles.paymentValue}>
              {formatDate(invoice.due_date)}
            </Text>
          </View>
        </View>

        {/* ── TAX NOTE ────────────────────────────────────────────── */}
        <Text style={styles.taxNote}>
          Hauling services are not subject to Texas sales tax per Texas Tax
          Code Chapter 151. This invoice reflects transportation/hauling
          services only.
        </Text>

        {/* ── THANK YOU ───────────────────────────────────────────── */}
        <Text style={styles.thankYou}>
          Thank you for your business.
        </Text>

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>J Fudge Trucking Inc</Text>
          <Text style={styles.footerText}>
            {JFT_COMPANY.phone} | {JFT_COMPANY.email}
          </Text>
          <Text style={styles.footerText}>
            Invoice {invoice.invoice_number}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
