export const LOAN_REJECTION_REASONS = [
  "Insufficient disposable income",
  "Employment details could not be verified",
  "Invalid or incomplete documents",
  "Failed affordability assessment",
  "Existing active loan obligation",
] as const;

export function isValidLoanRejectionReason(value: string) {
  return LOAN_REJECTION_REASONS.includes(
    value as (typeof LOAN_REJECTION_REASONS)[number]
  );
}