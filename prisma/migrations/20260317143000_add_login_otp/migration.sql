-- CreateTable
CREATE TABLE "LoginOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginOtp_userId_createdAt_idx" ON "LoginOtp"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LoginOtp_expiresAt_idx" ON "LoginOtp"("expiresAt");

-- AddForeignKey
ALTER TABLE "LoginOtp" ADD CONSTRAINT "LoginOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
