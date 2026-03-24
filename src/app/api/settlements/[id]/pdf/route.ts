import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { requireOneOfRoles } from "@/lib/supabase/auth";
import { getSettlementWithDetails } from "@/lib/services/settlement.service";
import { SettlementPDF } from "@/lib/pdf/settlement-template";

/**
 * GET /api/settlements/[id]/pdf
 *
 * Generates a settlement PDF on-the-fly and returns it as a downloadable PDF.
 * Auth: admin or the carrier who owns the settlement.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth check — admin or carrier
    const auth = await requireOneOfRoles(["admin", "carrier"]);

    // Fetch settlement with full details
    const settlement = await getSettlementWithDetails(id);

    if (!settlement) {
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      );
    }

    // If carrier, verify they own this settlement
    if (auth.profile.role === "carrier") {
      const carrierSettlement = settlement as unknown as { carrier_id?: string };
      if (carrierSettlement.carrier_id !== auth.profile.carrier_id) {
        return NextResponse.json(
          { error: "Not authorized to view this settlement" },
          { status: 403 }
        );
      }
    }

    // Render the PDF to buffer
    const pdfElement = React.createElement(SettlementPDF, { settlement });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(pdfElement as any);

    // Return PDF response with proper headers
    const uint8 = new Uint8Array(pdfBuffer);
    const settlementRef = settlement.id.slice(0, 8).toUpperCase();
    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="settlement-${settlementRef}.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("[api/settlements/pdf] Failed to generate PDF:", error);

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
