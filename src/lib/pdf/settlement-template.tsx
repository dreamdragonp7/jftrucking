import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
} from "@react-pdf/renderer";
import { JFT_COMPANY } from "@/lib/constants/company";
import type { SettlementWithFullDetails } from "@/lib/services/settlement.service";

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

  // Header
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
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: COLORS.deepBrown,
    letterSpacing: 1,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 8,
    color: COLORS.lightGray,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    width: 80,
    textAlign: "right",
  },
  metaValue: {
    fontFamily: "Courier",
    fontSize: 9,
    color: COLORS.black,
    width: 110,
    textAlign: "right",
  },

  // Dividers
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

  // Pay To section
  payToSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  payToBlock: {
    maxWidth: "60%",
  },
  payToLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLORS.deepBrown,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 6,
  },
  payToName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLORS.black,
    marginBottom: 2,
  },
  payToAddress: {
    fontSize: 9,
    color: COLORS.mediumGray,
    lineHeight: 1.5,
  },
  periodBlock: {
    maxWidth: "35%",
  },
  periodLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLORS.deepBrown,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 6,
  },
  periodValue: {
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
  },
  tableRowAlt: {
    backgroundColor: COLORS.bgLight,
  },
  colDate: {
    flex: 1.2,
  },
  colTicket: {
    flex: 1,
  },
  colMaterial: {
    flex: 1.5,
  },
  colWeight: {
    flex: 1,
    textAlign: "right",
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
    fontSize: 8.5,
    color: COLORS.darkGray,
  },
  cellMono: {
    fontFamily: "Courier",
    fontSize: 8.5,
    color: COLORS.black,
  },
  cellSubtext: {
    fontSize: 7,
    color: COLORS.lightGray,
    marginTop: 1,
  },

  // Totals
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  totalsBox: {
    width: 240,
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

  // Payment info
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
    width: 120,
  },
  paymentValue: {
    fontSize: 8,
    color: COLORS.darkGray,
    fontFamily: "Helvetica-Bold",
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

  // Note
  noteText: {
    marginTop: 16,
    fontSize: 8,
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
  const date = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// JFT Logo SVG (same as invoice template)
// ---------------------------------------------------------------------------

function JFTLogo() {
  return (
    <Svg width={50} height={50} viewBox="0 0 200 200">
      <Path
        d="m166.8 123.2-39.15-4.29c6.51-9.82 9.51-21.02 10.03-33.52-9.38 0.95-19.65 4.46-20.95 13.58-0.52 3.81-0.72 7.41-3.62 11.44-3.03 4.31-4.24 6.87-4.95 11.75-0.94 5.47-4.76 8.55-9.25 8.44-4.49 0.11-8.31-2.26-9.07-8.44-0.71-5.5-2.62-8.61-4.69-11.48-2.41-3.16-2.64-5.94-2.9-10.56-0.71-8.85-8.58-12.21-20.4-13.78 0.39 11.6 3.02 22.31 10.56 32.57l-38.21 3.9c0.35 6.99-3.75 11.71-10.95 13.33v39.54h2.44c6.23 0 9.38 2.99 9.21 7.78l43.98 6.61c9.03 1.42 17.12 3.98 20.83 7.93 3.71-3.55 10.67-5.93 20.83-7.62l45.17-6.55c-0.41-4.9 3.16-8.02 10.47-8.02v-39.61c-6.28-1.29-9.9-6.24-9.38-13z"
        fill="#4C1C06"
      />
      <Path
        d="m180.4 44.32c-1.12-0.95-1.84-0.48-1.07 1.29 3.47 7.95-0.1 14.88-9.18 21.11-4.27 3.04-11.12 4.57-14.72 4.9-2.19 0.21-2.06-1.37-1.32-3.32 3.05-7.33 8.02-14.45 15.17-20.98 8.92-8.35 11.99-16.34 9.66-34.62-0.54-2.67-2.45-2.62-2.13-0.37 2 12.49-2.03 22.01-12.48 30.74-1.09 0.89-1.52 0.11-1.33-1.42 2.2-13.38-0.26-26.77-4.76-38.63-0.71-1.61-1.68-1.01-1.08 1.29 2.87 10.75 2.35 22.88-0.52 34.15-0.53 1.98-1.37 1.12-2.13-0.29-3.91-5.4-7.91-9.5-13.43-12.44-1.65-0.91-2.41 0.4-1.07 2.07 8.75 10.11 12.77 16.12 10.72 27.86-2.23 9.15-8.76 17.18-16.59 20.04-1.49 0.54-1.9 0.07-0.81-3.29 2.1-6.23 1.23-11.78-0.33-20.84-0.42-1.46-1.44-1.03-1.36 0.49 0.05 10.86-5.41 23.83-16.63 29.96-4.95 2.41-6.88 7.43-15.32 7.43-6.85 0-10.06-4.36-12.55-5.94-9.33-3.77-16.87-13.38-18.34-25.31-0.27-2.17-0.07-3.49-0.16-6.05-0.06-1.48-1.27-1.61-1.57-0.09-1.91 8.26-1.97 14.66 0.77 21.78 0.89 2.82 0.19 2.65-1.73 1.86-8.22-3.15-15.47-12.29-17.88-20.28-2.01-10.71 3.6-18.44 9.98-27.45 1.49-2.24 1.3-3.61-0.52-2.49-5.7 3.36-10.39 8.51-13.53 13.66-0.82 1.34-1.94 1.3-2.46-0.85-3.02-10.58-1.94-21.64 0.66-34.61 0.37-2.07-1.43-1.98-1.83-0.17-3.89 12.45-4.8 24.37-3.02 34.78 0.42 2.32-1.25 3.89-2.77 2.45-9.9-7.48-12.1-15.01-11.62-27.35 0.08-1.91-1.44-1.57-2.01 0.41-4.58 12.38-1.05 23.01 7.87 31.45 7.58 7.07 13.24 13.34 17.32 23.36 1.34 3.31 1.43 3.6-1.55 3.12-13.16-2.26-23.84-7.29-26.25-16.18-0.97-3.81-0.13-7.18 1.51-9.69 1.22-2.02 0.05-2.93-1.18-1.54-4.05 3.96-5.03 9.41-3.22 14.72 3.63 9.74 12.02 15.24 24.37 19.73 2.82 1.06 3.19 1.96 1.46 2.44-3.57 1.06-4.09 6.51-1.59 9.02 2.28 2.42 7.37 2.08 9.78-0.57 0.76-0.85 0-1.1-0.93-0.72-2.41 1.04-3.6-1.52-2.16-3.04 1.61-1.77 3.8-2.44 9.54-2.39 12.22 0.09 27.63 4.21 28.6 16.21 0.31 3.99 0.43 6.2 2.66 9.29 2.69 3.85 4.5 7.98 5.07 12.81 0.53 4.73 3.35 6.21 6.53 6.09 3.19 0.12 6.29-2.2 7-6.77 0.71-5.67 2.89-9.47 5.81-13.5 2.1-2.82 2.18-6.37 3.17-10.83 2.82-10.3 14.82-12.55 23.16-13.17 7-0.38 10.76-0.77 13.95 1.32 2 1.23 1.79 3.7-0.8 3.95-1.12 0.12-2.15-0.93-2.42 0.07 0.93 1.85 4.03 2.85 7.22 2.73 4.27-0.17 4.98-4.54 3.63-7.05-0.94-1.9-1.83-2.24-2.92-3.04-0.88-0.72-0.36-1.29 2.09-2.52 5.6-2.38 10.1-3.82 17.05-11.48 4.95-5.31 7.5-9.55 8.47-13.64 0.38-3.81-0.97-7.26-3.95-9.66z"
        fill="#EDBC18"
      />
      <Path
        d="m99.26 73.76c-5.38 3.03-9.88 4.84-14.25 5.85 2.77 0.76 4.51 2.45 6.11 4.02 2.68 2.25 5.83 3.05 8.51 3.05 3.67 0 6.72-1.57 9.59-4.26 1.6-1.52 3.41-2.43 5.32-3.06-5.46-1.15-10.52-2.96-15.28-5.6z"
        fill="#4C1C06"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// SettlementPDF component
// ---------------------------------------------------------------------------

interface SettlementPDFProps {
  settlement: SettlementWithFullDetails;
}

export function SettlementPDF({ settlement }: SettlementPDFProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const carrier = settlement.carrier as any;
  const lines = settlement.lines ?? [];

  // Sort lines by delivery date
  const sortedLines = [...lines].sort((a, b) => {
    const dateA = a.delivery?.delivered_at ?? "";
    const dateB = b.delivery?.delivered_at ?? "";
    return dateA.localeCompare(dateB);
  });

  return (
    <Document
      title={`Settlement Statement - ${carrier?.name}`}
      author={JFT_COMPANY.name}
      subject={`Carrier Settlement for ${carrier?.name}`}
    >
      <Page size="LETTER" style={styles.page}>
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
            <Text style={styles.title}>SETTLEMENT{"\n"}STATEMENT</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Settlement #</Text>
              <Text style={styles.metaValue}>
                {(settlement as any).settlement_number ?? settlement.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>
                {formatDateLong(settlement.created_at.split("T")[0])}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Period</Text>
              <Text style={styles.metaValue}>
                {formatDate(settlement.period_start)} {" - "}{" "}
                {formatDate(settlement.period_end)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.dividerBold} />

        {/* ── PAY TO ──────────────────────────────────────────────── */}
        <View style={styles.payToSection}>
          <View style={styles.payToBlock}>
            <Text style={styles.payToLabel}>Pay To</Text>
            <Text style={styles.payToName}>{carrier?.name ?? "Carrier"}</Text>
            {carrier?.contact_name && (
              <Text style={styles.payToAddress}>
                Attn: {carrier.contact_name}
              </Text>
            )}
            {carrier?.address && (
              <Text style={styles.payToAddress}>{carrier.address}</Text>
            )}
            {carrier?.email && (
              <Text style={styles.payToAddress}>{carrier.email}</Text>
            )}
            {carrier?.phone && (
              <Text style={styles.payToAddress}>{carrier.phone}</Text>
            )}
          </View>
          <View style={styles.periodBlock}>
            <Text style={styles.periodLabel}>Billing Period</Text>
            <Text style={styles.periodValue}>
              {formatDateLong(settlement.period_start)}
            </Text>
            <Text style={styles.periodValue}>to</Text>
            <Text style={styles.periodValue}>
              {formatDateLong(settlement.period_end)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── DELIVERY LINE ITEMS TABLE ──────────────────────────── */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colDate}>
              <Text style={styles.tableHeaderText}>Date</Text>
            </View>
            <View style={styles.colTicket}>
              <Text style={styles.tableHeaderText}>Ticket #</Text>
            </View>
            <View style={styles.colMaterial}>
              <Text style={styles.tableHeaderText}>Material</Text>
            </View>
            <View style={styles.colWeight}>
              <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>
                Qty
              </Text>
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

          {sortedLines.map((line, index) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const delivery = line.delivery as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const material = delivery?.material as any;

            // Determine if per_load or per_ton:
            // Prefer the rate_type field on the line if available (future schema addition).
            // Fallback heuristic: if amount equals rate_applied and either there's no weight
            // or the weight doesn't produce the same amount, it's per_load.
            // Otherwise it's per_ton (weight x rate).
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const lineAny = line as any;
            const weight = delivery?.net_weight ?? 0;
            let isPerLoad: boolean;
            if (lineAny.rate_type === "per_load" || lineAny.rate_type === "per_ton") {
              isPerLoad = lineAny.rate_type === "per_load";
            } else {
              // Heuristic: per_load if amount === rate and weight-based calc doesn't match
              const weightCalc = weight * line.rate_applied;
              isPerLoad = line.amount === line.rate_applied && (weight === 0 || Math.abs(weightCalc - line.amount) > 0.01);
            }
            const qtyLabel = isPerLoad ? "1" : weight.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
            const unitLabel = isPerLoad ? "load" : "tons";

            return (
              <View
                key={line.id}
                style={[
                  styles.tableRow,
                  index % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <View style={styles.colDate}>
                  <Text style={styles.cellText}>
                    {delivery?.delivered_at
                      ? formatDate(delivery.delivered_at.split("T")[0])
                      : "--"}
                  </Text>
                </View>
                <View style={styles.colTicket}>
                  <Text style={styles.cellMono}>
                    {delivery?.ticket_number ?? "--"}
                  </Text>
                </View>
                <View style={styles.colMaterial}>
                  <Text style={styles.cellText}>
                    {material?.name ?? "Unknown"}
                  </Text>
                </View>
                <View style={styles.colWeight}>
                  <Text style={styles.cellMono}>
                    {qtyLabel}
                  </Text>
                  <Text style={styles.cellSubtext}>
                    {unitLabel}
                  </Text>
                </View>
                <View style={styles.colRate}>
                  <Text style={styles.cellMono}>
                    {formatMoney(line.rate_applied)}
                  </Text>
                  <Text style={styles.cellSubtext}>
                    /{unitLabel === "load" ? "load" : "ton"}
                  </Text>
                </View>
                <View style={styles.colAmount}>
                  <Text style={styles.cellMono}>
                    {formatMoney(line.amount)}
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
              <Text style={styles.totalsLabel}>
                Hauling Subtotal ({sortedLines.length} deliveries)
              </Text>
              <Text style={styles.totalsValue}>
                {formatMoney(settlement.hauling_amount)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Dispatch Fee</Text>
              <Text style={styles.totalsValue}>
                {formatMoney(settlement.dispatch_fee)}
              </Text>
            </View>
            {settlement.deductions > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Deductions</Text>
                <Text style={styles.totalsValue}>
                  ({formatMoney(settlement.deductions)})
                </Text>
              </View>
            )}
            <View style={styles.totalsFinalRow}>
              <Text style={styles.totalsFinalLabel}>TOTAL DUE</Text>
              <Text style={styles.totalsFinalValue}>
                {formatMoney(settlement.total_amount)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── PAYMENT INFO ────────────────────────────────────────── */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Information</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method:</Text>
            <Text style={styles.paymentValue}>ACH Direct Deposit</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Status:</Text>
            <Text style={styles.paymentValue}>
              {settlement.status === "paid"
                ? "Paid"
                : settlement.status === "approved"
                  ? "Approved - Processing"
                  : "Draft"}
            </Text>
          </View>
          {settlement.paid_at && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Paid On:</Text>
              <Text style={styles.paymentValue}>
                {formatDateLong(settlement.paid_at.split("T")[0])}
              </Text>
            </View>
          )}
        </View>

        {/* ── NOTE ────────────────────────────────────────────────── */}
        <Text style={styles.noteText}>
          This settlement statement is a record of payment for hauling services
          performed during the billing period indicated above.
        </Text>

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>J Fudge Trucking Inc</Text>
          <Text style={styles.footerText}>
            {JFT_COMPANY.phone} | {JFT_COMPANY.email}
          </Text>
          <Text style={styles.footerText}>
            Settlement {(settlement as any).settlement_number ?? settlement.id.slice(0, 8).toUpperCase()}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
