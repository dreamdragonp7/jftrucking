import { NextResponse, type NextRequest } from "next/server";

/**
 * QuickBooks webhook handler.
 * Receives event notifications from QuickBooks Online.
 * Verifies the webhook signature and processes events.
 *
 * Agent 4 (QuickBooks) will implement the full webhook processing here.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("intuit-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing webhook signature" },
      { status: 401 }
    );
  }

  const body = await request.text();

  // Verify signature and process webhook (Agent 4 will implement)
  console.log("[QB Webhook] Received event, signature present");

  return NextResponse.json({ status: "received" });
}
