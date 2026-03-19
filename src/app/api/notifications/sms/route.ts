import { NextResponse, type NextRequest } from "next/server";

/**
 * SMS notification endpoint.
 * Sends SMS via Twilio for delivery confirmations, dispatch alerts, etc.
 *
 * Agent 5 (Notifications) will implement the Twilio integration.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { to, message, type } = body as {
    to: string;
    message: string;
    type: "delivery_confirmation" | "dispatch_alert" | "payment_reminder" | "general";
  };

  if (!to || !message) {
    return NextResponse.json(
      { error: "Missing required fields: to, message" },
      { status: 400 }
    );
  }

  console.log(`[SMS] Sending ${type} notification to ${to}`);

  // Twilio sending will be implemented by Agent 5
  return NextResponse.json({
    status: "queued",
    to,
    type,
    timestamp: new Date().toISOString(),
  });
}
