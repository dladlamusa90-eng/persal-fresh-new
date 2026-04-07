DO $$ BEGIN
  CREATE TYPE "PointsEventType" AS ENUM ('ON_TIME_REPAYMENT', 'ADMIN_ADJUSTMENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "UserPointsEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "PointsEventType" NOT NULL,
  "pointsDelta" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "description" TEXT,
  "loanId" TEXT,
  "actorUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserPointsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserPointsEvent_userId_createdAt_idx" ON "UserPointsEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserPointsEvent_type_idx" ON "UserPointsEvent"("type");

DO $$ BEGIN
  ALTER TABLE "UserPointsEvent"
    ADD CONSTRAINT "UserPointsEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
