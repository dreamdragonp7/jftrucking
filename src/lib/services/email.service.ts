/**
 * Email service — sends invoice emails with PDF attachments via Resend.
 * Gracefully handles missing Resend configuration.
 */

import type { InvoiceWithDetails } from "@/types/database";
import { JFT_COMPANY } from "@/lib/constants/company";
import {
  generateInvoiceEmailSubject,
  generateInvoiceEmailHtml,
} from "@/lib/emails/invoice-email";

const EMAIL_FROM = process.env.EMAIL_FROM || `J Fudge Trucking Inc <noreply@resend.dev>`;

// ---------------------------------------------------------------------------
// Resend configuration check
// ---------------------------------------------------------------------------

function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

// ---------------------------------------------------------------------------
// Send invoice email with PDF attachment
// ---------------------------------------------------------------------------

export async function sendInvoiceEmail(
  invoice: InvoiceWithDetails,
  pdfBuffer: Buffer | Uint8Array
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isResendConfigured()) {
    console.log(
      "[email] Resend not configured. Invoice email skipped for:",
      invoice.invoice_number
    );
    return {
      success: false,
      error: "Email service not configured. Set RESEND_API_KEY in environment.",
    };
  }

  const billingEmail = invoice.customer.billing_email;
  if (!billingEmail) {
    console.log(
      "[email] No billing email for customer:",
      invoice.customer.name
    );
    return {
      success: false,
      error: `No billing email configured for ${invoice.customer.name}`,
    };
  }

  try {
    const { sendEmail } = await import("@/lib/integrations/resend");

    const portalUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const subject = generateInvoiceEmailSubject(invoice);
    const html = generateInvoiceEmailHtml(invoice, portalUrl);

    // Resend supports attachments — we need to use the raw Resend client
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      replyTo: JFT_COMPANY.email,
      to: [billingEmail],
      subject,
      html,
      attachments: [
        {
          filename: `${invoice.invoice_number}.pdf`,
          content: Buffer.from(pdfBuffer),
        },
      ],
    });

    if (error) {
      console.error("[email] Failed to send invoice email:", error);
      return { success: false, error: error.message };
    }

    console.log(
      "[email] Invoice email sent:",
      invoice.invoice_number,
      "to:",
      billingEmail,
      "id:",
      data?.id
    );

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("[email] Failed to send invoice email:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
