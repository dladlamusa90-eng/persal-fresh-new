import crypto from "crypto";

const STITCH_TOKEN_URL = "https://secure.stitch.money/connect/token";
const STITCH_AUTH_URL = "https://secure.stitch.money/connect/authorize";
const STITCH_GRAPHQL_URL = "https://api.stitch.money/graphql";

// ── PKCE helpers ──────────────────────────────────────────────────────────────

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

// ── Authorization URL (user-facing OAuth2 PKCE flow) ─────────────────────────

export function buildAuthorizationUrl(params: {
  codeChallenge: string;
  nonce: string;
  state: string;
}): string {
  const clientId = process.env.STITCH_CLIENT_ID;
  const redirectUri = process.env.STITCH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("STITCH_CLIENT_ID and STITCH_REDIRECT_URI must be set in environment");
  }

  const url = new URL(STITCH_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "openid accounts balances accountholders");
  url.searchParams.set("nonce", params.nonce);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

// ── Token exchange (authorization_code grant) ─────────────────────────────────

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<{ access_token: string; id_token?: string; expires_in: number }> {
  const clientId = process.env.STITCH_CLIENT_ID;
  const clientSecret = process.env.STITCH_CLIENT_SECRET;
  const redirectUri = process.env.STITCH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Stitch environment variables are not configured");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const res = await fetch(STITCH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stitch token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ── Client credentials token (for mandate creation) ──────────────────────────

export async function getClientToken(scope: string): Promise<string> {
  const clientId = process.env.STITCH_CLIENT_ID;
  const clientSecret = process.env.STITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Stitch environment variables are not configured");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope,
    audience: "https://secure.stitch.money/connect/token",
  });

  const res = await fetch(STITCH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stitch client token failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// ── GraphQL helper ─────────────────────────────────────────────────────────────

async function stitchGraphQL<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(STITCH_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Stitch GraphQL request failed (${res.status})`);
  }

  const data = await res.json();
  if (data.errors?.length) {
    throw new Error(`Stitch GraphQL errors: ${JSON.stringify(data.errors)}`);
  }
  return data.data as T;
}

// ── Bank account verification (user token) ────────────────────────────────────

export interface StitchBankAccount {
  id: string;
  name: string;
  accountNumber: string;
  branchCode: string;
  bankId: string;
  accountType: string;
}

export async function getUserBankAccounts(
  accessToken: string
): Promise<StitchBankAccount[]> {
  const query = `
    query GetUserBankAccounts {
      user {
        bankAccounts {
          id
          name
          accountNumber
          branchCode
          bankId
          accountType
        }
      }
    }
  `;

  const data = await stitchGraphQL<{ user: { bankAccounts: StitchBankAccount[] } }>(
    accessToken,
    query
  );
  return data.user?.bankAccounts ?? [];
}

// ── DebiCheck mandate creation (client token) ─────────────────────────────────

export interface DebiCheckMandateInput {
  debtorAccountNumber: string;
  debtorBranchCode: string;
  debtorBankId: string;
  debtorAccountType: "CHEQUE" | "SAVINGS" | "TRANSMISSION";
  debtorName: string;
  debtorIdNumber: string;
  /** Amount in ZAR cents */
  amountCents: number;
  collectionDay: number;
  firstCollectionDate: string; // YYYY-MM-DD
  merchantReference: string;
}

export async function createDebiCheckMandate(
  input: DebiCheckMandateInput
): Promise<{ id: string; status: string }> {
  const accessToken = await getClientToken("client_debicheck");

  const mutation = `
    mutation CreateDebiCheckMandate($input: CreateDebiCheckMandateInput!) {
      clientDebiCheckMandateCreate(input: $input) {
        mandate {
          id
          status
        }
        errors {
          field
          messages
        }
      }
    }
  `;

  const variables = {
    input: {
      debtorBankAccount: {
        accountNumber: input.debtorAccountNumber,
        branchCode: input.debtorBranchCode,
        bankId: input.debtorBankId,
        accountType: input.debtorAccountType,
      },
      amount: {
        quantity: input.amountCents,
        currency: "ZAR",
      },
      frequency: {
        intervalUnit: "MONTHLY",
        dayOfMonth: input.collectionDay,
      },
      debtorName: input.debtorName,
      debtorIdNumber: input.debtorIdNumber,
      merchantReference: input.merchantReference,
      firstCollectionDate: input.firstCollectionDate,
    },
  };

  const data = await stitchGraphQL<{
    clientDebiCheckMandateCreate: {
      mandate: { id: string; status: string } | null;
      errors: Array<{ field: string; messages: string[] }> | null;
    };
  }>(accessToken, mutation, variables);

  const result = data.clientDebiCheckMandateCreate;
  if (result.errors?.length) {
    throw new Error(`Stitch mandate validation failed: ${JSON.stringify(result.errors)}`);
  }
  if (!result.mandate) {
    throw new Error("Stitch mandate creation returned no mandate");
  }

  return result.mandate;
}

// ── Bank name ↔ Stitch bankId mapping ────────────────────────────────────────

const STITCH_BANK_IDS: Record<string, string> = {
  absa: "absa",
  capitec: "capitec",
  "first national bank": "fnb",
  fnb: "fnb",
  nedbank: "nedbank",
  "standard bank": "standard_bank",
  investec: "investec",
  tymebank: "tyme_bank",
  "african bank": "african_bank",
  "bidvest bank": "bidvest",
  "discovery bank": "discovery",
  "old mutual": "old_mutual",
};

const STITCH_BANK_NAMES: Record<string, string> = {
  absa: "ABSA",
  capitec: "Capitec",
  fnb: "First National Bank",
  nedbank: "Nedbank",
  standard_bank: "Standard Bank",
  investec: "Investec",
  tyme_bank: "TymeBank",
  african_bank: "African Bank",
  bidvest: "Bidvest Bank",
  discovery: "Discovery Bank",
  old_mutual: "Old Mutual",
};

export function bankNameToStitchId(bankName: string): string {
  const lower = bankName.toLowerCase().trim();
  for (const [key, id] of Object.entries(STITCH_BANK_IDS)) {
    if (lower.includes(key)) return id;
  }
  return lower.replace(/\s+/g, "_");
}

export function stitchIdToBankName(bankId: string): string {
  return STITCH_BANK_NAMES[bankId.toLowerCase()] ?? bankId;
}

export function mapStitchAccountType(
  type: string
): "CHEQUE" | "SAVINGS" | "TRANSMISSION" {
  const t = type.toUpperCase();
  if (t === "CHEQUE" || t === "CURRENT") return "CHEQUE";
  if (t === "SAVINGS") return "SAVINGS";
  return "TRANSMISSION";
}
