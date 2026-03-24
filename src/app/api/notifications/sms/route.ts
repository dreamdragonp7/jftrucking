import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/supabase/auth";

/**
 * SMS notification endpoint.
 * Sends SMS via Twilio for delivery confirmations, dispatch alerts, etc.
 *
 * Security: Only admin users can trigger SMS notifications.
 */
export async function POST(request: NextRequest) {
  // Authenticate — only admins can send SMS notifications
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON body" },
      { status: 400 }
    );
  }

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

  // Twilio sending is not yet configured
  return NextResponse.json(
    {
      status: "not_implemented",
      error: "SMS sending is not yet configured",
    },
    { status: 501 }
  );
}
