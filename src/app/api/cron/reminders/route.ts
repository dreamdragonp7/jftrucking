import { NextResponse, type NextRequest } from "next/server";

/**
 * Cron: Send payment reminders.
 * Runs daily at 3 PM CT via Vercel Cron.
 * Sends SMS/email reminders for overdue invoices.
 *
 * Agent 5 (Notifications) will implement the reminder logic.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] Payment reminders started");

  return NextResponse.json({
    status: "completed",
    reminders_sent: 0,
    timestamp: new Date().toISOString(),
  });
}
