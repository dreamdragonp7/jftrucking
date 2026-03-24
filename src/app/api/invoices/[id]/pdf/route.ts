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
 */
export async function GET(
  _request: NextRequest,
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

    // Render the PDF to buffer
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
