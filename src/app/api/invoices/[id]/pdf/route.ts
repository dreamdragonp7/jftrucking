import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { requireAuth } from "@/lib/supabase/auth";
import { getInvoiceWithDetails } from "@/lib/services/invoice.service";
import { InvoicePDF } from "@/lib/pdf/invoice-template";
import type { InvoiceWithDetails } from "@/types/database";

/**
 * GET /api/invoices/[id]/pdf
 *
 * Generates an invoice PDF on-the-fly and returns it as a downloadable PDF.
 * Auth: admin can download any invoice; customer can only download their own.
 *
 * Query params:
 *   ?source=qbo  — fetch the native QBO PDF instead of generating one
 *                  (requires invoice to have a qb_invoice_id)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth check
    const auth = await requireAuth();
    const userRole = auth.profile.role;

    // Fetch invoice with full details
    const invoice = await getInvoiceWithDetails(id);

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Authorization: admin can access any invoice, customer only their own
    if (userRole === "customer") {
      // Check if this customer's profile matches the invoice customer
      const companyName = auth.profile.company_name;
      if (
        !companyName ||
        companyName.toLowerCase() !== invoice.customer.name.toLowerCase()
      ) {
        return NextResponse.json(
          { error: "You do not have access to this invoice" },
          { status: 403 }
        );
      }
    } else if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // ---- QBO Native PDF (optional: ?source=qbo) ----
    const source = request.nextUrl.searchParams.get("source");
    if (source === "qbo" && invoice.qb_invoice_id) {
      try {
        const { getClient } = await import("@/lib/integrations/quickbooks");
        const qbClient = await getClient();
        if (qbClient) {
          const pdfUrl = `${qbClient.baseUrl}/v3/company/${qbClient.realmId}/invoice/${invoice.qb_invoice_id}/pdf?minorversion=75`;
          const res = await fetch(pdfUrl, {
            headers: {
              Authorization: `Bearer ${qbClient.tokens.accessToken}`,
              Accept: "application/pdf",
            },
          });
          if (res.ok) {
            const pdfBuffer = await res.arrayBuffer();
            return new NextResponse(pdfBuffer, {
              headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="invoice-${invoice.invoice_number}-qbo.pdf"`,
                "Cache-Control": "private, max-age=60",
              },
            });
          }
          console.warn(
            `[api/invoices/pdf] QBO PDF fetch failed (${res.status}), falling back to JFT PDF`
          );
        }
      } catch (qboErr) {
        console.warn("[api/invoices/pdf] QBO PDF error, falling back to JFT PDF:", qboErr);
      }
      // Fall through to JFT's @react-pdf generation if QBO fetch fails
    }

    // ---- JFT Custom PDF (default) ----
    const pdfElement = React.createElement(InvoicePDF, { invoice });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(pdfElement as any);

    // Return PDF response with proper headers
    const uint8 = new Uint8Array(pdfBuffer);
    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoice_number}.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("[api/invoices/pdf] Failed to generate PDF:", error);

    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
