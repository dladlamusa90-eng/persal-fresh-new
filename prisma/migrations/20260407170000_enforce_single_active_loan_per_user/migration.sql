CREATE UNIQUE INDEX IF NOT EXISTS "loan_one_open_per_user_idx"
ON "Loan"("userId")
WHERE "status" IN ('PENDING', 'APPROVED');
