-- Add Stitch integration fields to User and Loan models

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bankVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stitchAccountId" TEXT;

ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "stitchMandateId" TEXT;
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "stitchMandateStatus" TEXT;
