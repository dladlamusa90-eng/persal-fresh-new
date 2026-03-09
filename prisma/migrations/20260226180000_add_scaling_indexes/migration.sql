CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_isBurned_idx" ON "User"("isBurned");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

CREATE INDEX IF NOT EXISTS "Loan_status_idx" ON "Loan"("status");
CREATE INDEX IF NOT EXISTS "Loan_userId_status_idx" ON "Loan"("userId", "status");
CREATE INDEX IF NOT EXISTS "Loan_createdAt_idx" ON "Loan"("createdAt");
