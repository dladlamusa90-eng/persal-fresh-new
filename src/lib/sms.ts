const WINSMS_API_KEY = process.env.WINSMS_API_KEY;

/**
 * Send an SMS via WinSMS.
 * Throws if WinSMS credentials are not configured.
 */
export async function sendSms(to: string, message: string): Promise<void> {
  if (!WINSMS_API_KEY) {
    throw new Error(
      "SMS credentials are not configured. Please set WINSMS_API_KEY in your .env.local file."
    );
  }

  const normalizedTo = normalizeSouthAfricanPhone(to);

  const response = await fetch("https://www.winsms.co.za/apis/rest/v1/sms/outgoing", {
    method: "POST",
    headers: {
      "Authorization": WINSMS_API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      sendTime: "",
      recipients: [{ mobileNumber: normalizedTo }],
      message,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`WinSMS error ${response.status}: ${text}`);
  }

  const result = (await response.json()) as {
    statusCode?: number;
    statusDescription?: string;
    recipients?: Array<{ mobileNumber: string; clientMessageId: number; accepted: boolean; acceptError: string }>;
  };

  const failed = result.recipients?.find((r) => !r.accepted);
  if (failed) {
    throw new Error(`WinSMS rejected recipient ${failed.mobileNumber}: ${failed.acceptError}`);
  }
}

/**
 * Normalize a South African phone number to the format WinSMS expects (27xxxxxxxxx — no +).
 */
function normalizeSouthAfricanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // Already in international format without +
  if (digits.startsWith("27") && digits.length === 11) {
    return digits;
  }

  // Local 10-digit format starting with 0
  if (digits.startsWith("0") && digits.length === 10) {
    return `27${digits.slice(1)}`;
  }

  // 9-digit local number without leading 0
  if (digits.length === 9) {
    return `27${digits}`;
  }

  // Strip leading + if present and return
  return digits.startsWith("+") ? digits.slice(1) : digits;
}
