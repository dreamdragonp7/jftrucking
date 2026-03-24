/**
 * Invoice email HTML template.
 * Uses plain HTML/CSS for maximum email client compatibility.
 * No external dependencies — generates a string of HTML.
 */

import { JFT_COMPANY } from "@/lib/constants/company";
import type { InvoiceWithDetails } from "@/types/database";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function generateInvoiceEmailSubject(invoice: InvoiceWithDetails): string {
  return `Invoice ${invoice.invoice_number} from ${JFT_COMPANY.name}`;
}

export function generateInvoiceEmailHtml(
  invoice: InvoiceWithDetails,
  portalUrl: string
): string {
  const viewUrl = `${portalUrl}/customer/invoices/${invoice.id}`;
  const payUrl = invoice.qb_payment_link ?? null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f5f4;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header with brand bar -->
          <tr>
            <td style="background-color:#4C1C06;padding:24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:20px;font-weight:bold;color:#EDBC18;letter-spacing:0.5px;">
                      ${JFT_COMPANY.name}
                    </p>
                    <p style="margin:4px 0 0;font-size:12px;color:#d4a574;">
                      Aggregate Hauling Services
                    </p>
                  </td>
                  <td align="right" valign="middle">
                    <p style="margin:0;font-size:13px;font-weight:bold;color:#EDBC18;text-transform:uppercase;letter-spacing:1px;">
                      Invoice
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:32px;">

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#1a1a1a;">
                You have a new invoice
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#666666;line-height:1.5;">
                Hello ${invoice.customer.name},<br/>
                A new invoice has been generated for hauling services provided during
                ${formatDate(invoice.period_start)} &ndash; ${formatDate(invoice.period_end)}.
              </p>

              <!-- Invoice summary card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fafaf9;border-radius:8px;border:1px solid #e7e5e4;">
                <tr>
                  <td style="padding:20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="50%" style="padding-bottom:12px;">
                          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#a8a29e;">Invoice Number</p>
                          <p style="margin:4px 0 0;font-size:16px;font-weight:bold;font-family:'Courier New',Courier,monospace;color:#4C1C06;">
                            ${invoice.invoice_number}
                          </p>
                        </td>
                        <td width="50%" align="right" style="padding-bottom:12px;">
                          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#a8a29e;">Amount Due</p>
                          <p style="margin:4px 0 0;font-size:22px;font-weight:bold;font-family:'Courier New',Courier,monospace;color:#1a1a1a;">
                            ${formatMoney(invoice.total)}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-top:1px solid #e7e5e4;padding-top:12px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td width="33%">
                                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#a8a29e;">Invoice Date</p>
                                <p style="margin:4px 0 0;font-size:13px;color:#44403c;font-family:'Courier New',Courier,monospace;">
                                  ${formatDate(invoice.created_at.split("T")[0])}
                                </p>
                              </td>
                              <td width="33%">
                                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#a8a29e;">Due Date</p>
                                <p style="margin:4px 0 0;font-size:13px;font-weight:bold;color:#dc2626;font-family:'Courier New',Courier,monospace;">
                                  ${formatDate(invoice.due_date)}
                                </p>
                              </td>
                              <td width="33%">
                                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#a8a29e;">Terms</p>
                                <p style="margin:4px 0 0;font-size:13px;color:#44403c;">
                                  ${invoice.customer.payment_terms.replace("net_", "Net ")}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action buttons -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:24px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-right:12px;">
                          <a href="${viewUrl}" target="_blank" style="display:inline-block;padding:12px 28px;background-color:#4C1C06;color:#EDBC18;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
                            View Invoice
                          </a>
                        </td>
                        ${
                          payUrl
                            ? `<td>
                          <a href="${payUrl}" target="_blank" style="display:inline-block;padding:12px 28px;background-color:#EDBC18;color:#4C1C06;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
                            Pay Now
                          </a>
                        </td>`
                            : `<td>
                          <a href="${viewUrl}" target="_blank" style="display:inline-block;padding:12px 28px;background-color:#e7e5e4;color:#44403c;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
                            View Details
                          </a>
                        </td>`
                        }
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Note about PDF -->
              <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;text-align:center;line-height:1.5;">
                A PDF copy of this invoice is attached to this email for your records.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafaf9;border-top:1px solid #e7e5e4;padding:20px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;font-weight:bold;color:#4C1C06;">
                      ${JFT_COMPANY.name}
                    </p>
                    <p style="margin:4px 0 0;font-size:11px;color:#a8a29e;line-height:1.6;">
                      ${JFT_COMPANY.address}<br/>
                      ${JFT_COMPANY.city}, ${JFT_COMPANY.state} ${JFT_COMPANY.zip}<br/>
                      ${JFT_COMPANY.phone} &bull; ${JFT_COMPANY.email}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Disclaimer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:16px 0;text-align:center;">
              <p style="margin:0;font-size:10px;color:#a8a29e;line-height:1.5;">
                This email was sent by J Fudge Trucking Inc regarding your hauling services invoice.
                If you believe this was sent in error, please contact us at ${JFT_COMPANY.email}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
