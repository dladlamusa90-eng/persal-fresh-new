-- AlterTable: add referral system fields to User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "referralCode" TEXT,
  ADD COLUMN IF NOT EXISTS "referralDiscountPct" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "usedReferralCode" TEXT;

-- CreateIndex: unique referral code
CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");

-- Backfill: generate a unique referral code for all existing users who don't have one
DO $$
DECLARE
  rec RECORD;
  candidate TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code_len INT := 8;
  i INT;
  ch INT;
BEGIN
  FOR rec IN SELECT id FROM "User" WHERE "referralCode" IS NULL LOOP
    LOOP
      candidate := '';
      FOR i IN 1..code_len LOOP
        ch := floor(random() * length(chars) + 1)::INT;
        candidate := candidate || substr(chars, ch, 1);
      END LOOP;
      BEGIN
        UPDATE "User" SET "referralCode" = candidate WHERE id = rec.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- retry with a different code
      END;
    END LOOP;
  END LOOP;
END;
$$;
