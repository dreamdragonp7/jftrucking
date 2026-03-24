/**
 * Twilio SMS client for JFT dispatch notifications.
 *
 * Handles missing Twilio config gracefully — logs a warning instead of crashing.
 * Config is controlled by env vars:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

export interface SMSPayload {
  to: string;
  body: string;
}

export interface SMSResult {
  sid: string;
  status: string;
  to: string;
}

export interface DispatchSMSDetails {
  material: string;
  pickupSite: string;
  deliverySite: string;
  siteContact?: string | null;
  sitePhone?: string | null;
  scheduledDate: string;
  /** Number of loads dispatched (for multi-load auto-dispatch) */
  loadCount?: number;
}

/**
 * Check if Twilio is configured.
 */
export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

/**
 * Send an SMS via Twilio.
 * Returns null if Twilio is not configured (logs warning).
 */
export async function sendSMS(payload: SMSPayload): Promise<SMSResult | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn(
      "[twilio] SMS not sent — Twilio env vars not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER."
    );
    return null;
  }

  try {
    // Dynamic import to keep Twilio server-only
    const twilio = await import("twilio");
    const client = twilio.default(accountSid, authToken);

    const message = await client.messages.create({
      body: payload.body,
      from: fromNumber,
      to: payload.to,
    });

    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
    };
  } catch (error) {
    console.error("[twilio] Failed to send SMS:", error);
    throw error;
  }
}

/**
 * Send a dispatch notification SMS to a driver.
 * Formats the message with load details.
 */
export async function sendDispatchSMS(
  driverPhone: string,
  details: DispatchSMSDetails
): Promise<SMSResult | null> {
  const contactInfo = details.siteContact
    ? ` Contact: ${details.siteContact}${details.sitePhone ? ` ${details.sitePhone}` : ""}.`
    : "";

  const formattedDate = new Date(details.scheduledDate).toLocaleDateString(
    "en-US",
    { weekday: "short", month: "short", day: "numeric" }
  );

  const loadInfo = details.loadCount && details.loadCount > 1
    ? `${details.loadCount} loads assigned`
    : "New load assigned";

  const body = `JFT: ${loadInfo}. ${details.material} from ${details.pickupSite} to ${details.deliverySite}.${contactInfo} Date: ${formattedDate}`;

  return sendSMS({
    to: driverPhone,
    body,
  });
}
