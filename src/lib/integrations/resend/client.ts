/**
 * Resend email client.
 *
 * Agent 5 (Notifications) will implement email templates for:
 * - Invoice delivery
 * - Payment confirmations
 * - Delivery notifications
 * - Account invitations
 */

import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[Resend] RESEND_API_KEY is not configured");
      return null;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  id: string;
}

/**
 * Send an email via Resend.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const resend = getResend();

  if (!resend) {
    throw new Error("Resend is not configured. Set RESEND_API_KEY environment variable.");
  }

  const { data, error } = await resend.emails.send({
    from: payload.from || process.env.EMAIL_FROM || "J Fudge Trucking Inc <noreply@resend.dev>",
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
    replyTo: payload.replyTo,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { id: data!.id };
}
