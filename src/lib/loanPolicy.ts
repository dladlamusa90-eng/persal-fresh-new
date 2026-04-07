export const MIN_LOAN_AMOUNT = 100;
export const FIRST_TIME_MAX_LOAN = 2500;
export const RETURNING_MAX_LOAN = 5000;

export const ALLOWED_TERM_DAYS = [30, 60, 90] as const;

export function getMaxLoanForUser(isReturningUser: boolean) {
  return isReturningUser ? RETURNING_MAX_LOAN : FIRST_TIME_MAX_LOAN;
}

export function getTermMonths(termDays: number) {
  if (termDays >= 90) return 3;
  if (termDays >= 60) return 2;
  return 1;
}

export function calculateLogicalMaxLoan(salary: number, disposable: number, maxCap: number) {
  if (salary < 2000) return 0;

  const minCap = 500;
  const scaledCap = minCap + ((salary - 2000) / (10000 - 2000)) * (maxCap - minCap);
  const scaled = Math.min(scaledCap, maxCap);

  return Math.floor(Math.min(disposable, scaled, maxCap));
}

export function calculateLoanCharges(amount: number, termDays: number) {
  const termMonths = getTermMonths(termDays);

  const interestMonth1 = amount * 0.05;
  const interestMonth2 = termMonths >= 2 ? amount * 0.03 : 0;
  const interestMonth3 = termMonths >= 3 ? amount * 0.02 : 0;

  let initiationFee = 0;
  if (amount <= 1000) {
    initiationFee = 150;
  } else if (amount <= 1500) {
    initiationFee = 200;
  } else {
    initiationFee = 300;
  }

  const serviceFee = 60;
  const totalCost = interestMonth1 + interestMonth2 + interestMonth3 + initiationFee + serviceFee;
  const totalRepayable = Math.round(amount + totalCost);

  return {
    termMonths,
    interestMonth1,
    interestMonth2,
    interestMonth3,
    initiationFee,
    serviceFee,
    totalCost,
    totalRepayable,
  };
}

export function getTermEndDate(startDate: Date, termDays: number) {
  const result = new Date(startDate);
  result.setDate(result.getDate() + termDays);
  return result;
}

export function calculatePointsForRepayment(amount: number) {
  if (amount >= 1000) return 300;
  if (amount >= 500) return 200;
  return 100;
}