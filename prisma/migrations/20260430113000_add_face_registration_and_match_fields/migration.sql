-- Add face registration and live verification snapshots
ALTER TABLE "User"
  ADD COLUMN "faceIdRegistrationPhoto" TEXT,
  ADD COLUMN "faceIdLastLivePhoto" TEXT,
  ADD COLUMN "faceIdLastMatchPassed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "faceIdLastMatchedAt" TIMESTAMP(3);

ALTER TABLE "Loan"
  ADD COLUMN "faceRegistrationPhotoSnapshot" TEXT,
  ADD COLUMN "faceVerificationPhoto" TEXT,
  ADD COLUMN "faceMatchPassed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "faceMatchCheckedAt" TIMESTAMP(3);
