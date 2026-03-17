import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

/**
 * Send an SMS via Twilio.
 * Throws if Twilio credentials are not configured.
 */
export async function sendSms(to: string, message: string): Promise<void> {
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      "SMS credentials are not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your .env.local file."
    );
  }

  const normalizedTo = normalizeSouthAfricanPhone(to);

  const client = twilio(accountSid, authToken);
  await client.messages.create({
    body: message,
    from: fromNumber,
    to: normalizedTo,
  });
}

/**
 * Normalize a South African phone number to E.164 format (+27...).
 */
function normalizeSouthAfricanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // Already in international format
  if (digits.startsWith("27") && digits.length === 11) {
    return `+${digits}`;
  }

  // Local 10-digit format starting with 0
  if (digits.startsWith("0") && digits.length === 10) {
    return `+27${digits.slice(1)}`;
  }

  // If it looks like it already has +27 stripped
  if (digits.length === 9) {
    return `+27${digits}`;
  }

  // Return as-is with + prefix (Twilio will reject if invalid)
  return digits.startsWith("+") ? phone : `+${digits}`;
}
