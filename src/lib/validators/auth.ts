type LoginInput = {
  identifier: string;
  password: string;
};

export const SOUTH_AFRICAN_BANK_NAMES = [
  "ABSA",
  "African Bank",
  "Bidvest Bank",
  "Capitec",
  "Discovery Bank",
  "FNB",
  "Investec",
  "Nedbank",
  "Standard Bank",
  "TymeBank",
  "Ubank",
] as const;

const BANK_ACCOUNT_NUMBER_LENGTHS: Record<(typeof SOUTH_AFRICAN_BANK_NAMES)[number], readonly number[]> = {
  ABSA: [10],
  "African Bank": [11],
  "Bidvest Bank": [10],
  Capitec: [10],
  "Discovery Bank": [11],
  FNB: [11],
  Investec: [11],
  Nedbank: [10],
  "Standard Bank": [10],
  TymeBank: [11],
  Ubank: [11],
};

export function isSouthAfricanBankName(bankName: string) {
  const normalized = bankName.trim().toLowerCase();
  return SOUTH_AFRICAN_BANK_NAMES.some((bank) => bank.toLowerCase() === normalized);
}

export function getBankAccountNumberLengths(bankName: string) {
  const matchedBank = SOUTH_AFRICAN_BANK_NAMES.find(
    (bank) => bank.toLowerCase() === bankName.trim().toLowerCase()
  );

  if (!matchedBank) {
    return null;
  }

  return [...BANK_ACCOUNT_NUMBER_LENGTHS[matchedBank]];
}

export function normalizeAccountNumber(accountNumber: string) {
  return accountNumber.replace(/\D/g, "");
}

export function isValidBankAccountNumber(bankName: string, accountNumber: string) {
  const allowedLengths = getBankAccountNumberLengths(bankName);
  if (!allowedLengths) {
    return false;
  }

  const normalized = normalizeAccountNumber(accountNumber);
  return allowedLengths.includes(normalized.length);
}

export function getBankAccountConstraintLabel(bankName: string) {
  const allowedLengths = getBankAccountNumberLengths(bankName);
  if (!allowedLengths || allowedLengths.length === 0) {
    return "a valid account number";
  }

  if (allowedLengths.length === 1) {
    return `${allowedLengths[0]} digits`;
  }

  return `${allowedLengths.join(" or ")} digits`;
}

export function normalizePhoneNumber(phone: string) {
  return phone.replace(/[\s()-]/g, "");
}

export function normalizePersalNumber(persal: string) {
  return persal.replace(/\D/g, "");
}

export function normalizeIdNumber(idNumber: string) {
  return idNumber.replace(/\D/g, "");
}

function isValidSouthAfricanDate(yyMMdd: string) {
  const yy = Number(yyMMdd.slice(0, 2));
  const mm = Number(yyMMdd.slice(2, 4));
  const dd = Number(yyMMdd.slice(4, 6));

  if (!Number.isInteger(yy) || !Number.isInteger(mm) || !Number.isInteger(dd)) {
    return false;
  }

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return false;
  }

  const currentYear = new Date().getFullYear();
  const currentYearShort = currentYear % 100;
  const fullYear = yy <= currentYearShort ? 2000 + yy : 1900 + yy;

  const parsed = new Date(fullYear, mm - 1, dd);
  return (
    parsed.getFullYear() === fullYear &&
    parsed.getMonth() === mm - 1 &&
    parsed.getDate() === dd
  );
}

export function isSouthAfricanIdNumber(idNumber: string) {
  const normalized = normalizeIdNumber(idNumber);

  if (!/^[0-9]{13}$/.test(normalized)) {
    return false;
  }

  if (!isValidSouthAfricanDate(normalized.slice(0, 6))) {
    return false;
  }

  let oddSum = 0;
  for (let index = 0; index < 12; index += 2) {
    oddSum += Number(normalized[index]);
  }

  let evenDigits = "";
  for (let index = 1; index < 12; index += 2) {
    evenDigits += normalized[index];
  }

  const doubledEven = String(Number(evenDigits) * 2);
  const evenSum = doubledEven
    .split("")
    .reduce((sum, digit) => sum + Number(digit), 0);

  const total = oddSum + evenSum;
  const checkDigit = (10 - (total % 10)) % 10;

  return checkDigit === Number(normalized[12]);
}

export function isValidPersalNumber(persal: string) {
  const normalized = normalizePersalNumber(persal);
  return /^[0-9]{8}$/.test(normalized);
}

export function isValidBranchCode(branchCode: string) {
  return /^[0-9]{6}$/.test(branchCode.trim());
}

export function isValidBankAccountType(accountType: string) {
  return ["CHEQUE", "SAVINGS", "TRANSMISSION"].includes(accountType.trim().toUpperCase());
}

export function isSouthAfricanPhoneNumber(phone: string) {
  const normalized = normalizePhoneNumber(phone);
  return /^(?:\+27|0)[1-9][0-9]{8}$/.test(normalized);
}

type SafeParseResult =
  | { success: true; data: LoginInput }
  | { success: false; error: string };

export const loginSchema = {
  safeParse(input: unknown): SafeParseResult {
    if (!input || typeof input !== "object") {
      return { success: false, error: "Invalid input" };
    }

    const maybeIdentifier =
      (input as Record<string, unknown>).identifier ?? (input as Record<string, unknown>).email;
    const maybePassword = (input as Record<string, unknown>).password;

    if (typeof maybeIdentifier !== "string" || typeof maybePassword !== "string") {
      return { success: false, error: "Invalid input" };
    }

    const identifier = maybeIdentifier.trim();
    const password = maybePassword;

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.toLowerCase());
    const isId = isSouthAfricanIdNumber(identifier);
    if ((!isEmail && !isId) || password.length < 1) {
      return { success: false, error: "Invalid input" };
    }

    return {
      success: true,
      data: {
        identifier,
        password,
      },
    };
  },
};
