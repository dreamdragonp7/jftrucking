/**
 * Twilio SMS client.
 *
 * Agent 5 (Notifications) will implement the full Twilio integration.
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

/**
 * Send an SMS via Twilio.
 * Uses environment variables for configuration.
 */
export async function sendSMS(payload: SMSPayload): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER!;

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
}
