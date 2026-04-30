-- Add FaceID verification tracking fields to User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "faceIdExternalUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "faceIdEnrolled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "faceIdStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "faceIdVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "faceIdLastCheckedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "faceIdLastError" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_faceIdExternalUserId_key"
  ON "User"("faceIdExternalUserId");

CREATE INDEX IF NOT EXISTS "User_faceIdStatus_idx"
  ON "User"("faceIdStatus");
