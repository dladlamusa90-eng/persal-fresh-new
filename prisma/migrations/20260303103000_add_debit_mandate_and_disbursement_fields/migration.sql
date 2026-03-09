-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('CHEQUE', 'SAVINGS', 'TRANSMISSION');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "accountType" "BankAccountType",
ADD COLUMN "branchCode" TEXT;

-- AlterTable
ALTER TABLE "Loan"
ADD COLUMN "debitMandateAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "debitMandateAcceptedAt" TIMESTAMP(3),
ADD COLUMN "debitMandateReference" TEXT,
ADD COLUMN "disbursementSentAt" TIMESTAMP(3),
ADD COLUMN "disbursementReference" TEXT,
ADD COLUMN "disbursementMode" TEXT;