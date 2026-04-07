-- Add soft-delete support for users
ALTER TABLE "User"
ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Add notifications sent by admins to users
CREATE TYPE "AdminNotificationType" AS ENUM ('MESSAGE');

CREATE TABLE "AdminNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "AdminNotificationType" NOT NULL DEFAULT 'MESSAGE',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "User_isDeleted_idx" ON "User"("isDeleted");
CREATE INDEX "AdminNotification_userId_createdAt_idx" ON "AdminNotification"("userId", "createdAt");
CREATE INDEX "AdminNotification_userId_readAt_idx" ON "AdminNotification"("userId", "readAt");

ALTER TABLE "AdminNotification"
ADD CONSTRAINT "AdminNotification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
