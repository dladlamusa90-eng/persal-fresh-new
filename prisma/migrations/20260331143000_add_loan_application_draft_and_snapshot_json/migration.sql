ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "applicationData" JSONB;
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "applicationDocuments" JSONB;

CREATE TABLE IF NOT EXISTS "LoanApplicationDraft" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "data" JSONB,
  "documents" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LoanApplicationDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoanApplicationDraft_userId_key" ON "LoanApplicationDraft"("userId");
CREATE INDEX IF NOT EXISTS "LoanApplicationDraft_updatedAt_idx" ON "LoanApplicationDraft"("updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LoanApplicationDraft_userId_fkey'
  ) THEN
    ALTER TABLE "LoanApplicationDraft"
    ADD CONSTRAINT "LoanApplicationDraft_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;