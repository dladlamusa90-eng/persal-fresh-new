-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "profileImage" TEXT,
  ADD COLUMN "isBurned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "burnedAt" TIMESTAMP(3);
