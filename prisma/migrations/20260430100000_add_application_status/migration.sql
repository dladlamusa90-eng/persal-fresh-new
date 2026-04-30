-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable: add applicationStatus defaulting to APPROVED for all existing rows
ALTER TABLE "User" ADD COLUMN "applicationStatus" "ApplicationStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "User" ADD COLUMN "applicationApprovedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "applicationRejectedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "applicationRejectionReason" TEXT;

-- Change the column default to PENDING so new sign-ups start as pending
ALTER TABLE "User" ALTER COLUMN "applicationStatus" SET DEFAULT 'PENDING';
