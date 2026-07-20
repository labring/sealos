-- CreateTable
CREATE TABLE "VerificationCode" (
    "uid" UUID NOT NULL,
    "userUid" UUID,
    "scenario" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "VerificationRateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VerificationRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "VerificationFlowTicket" (
    "uid" UUID NOT NULL,
    "userUid" UUID NOT NULL,
    "providerType" TEXT NOT NULL,
    "oldProviderId" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VerificationFlowTicket_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCode_scenario_providerType_providerId_key" ON "VerificationCode"("scenario", "providerType", "providerId");

-- CreateIndex
CREATE INDEX "VerificationCode_expiresAt_idx" ON "VerificationCode"("expiresAt");

-- CreateIndex
CREATE INDEX "VerificationRateLimit_expiresAt_idx" ON "VerificationRateLimit"("expiresAt");

-- CreateIndex
CREATE INDEX "VerificationFlowTicket_expiresAt_idx" ON "VerificationFlowTicket"("expiresAt");

-- CreateIndex
CREATE INDEX "VerificationFlowTicket_userUid_providerType_scenario_idx" ON "VerificationFlowTicket"("userUid", "providerType", "scenario");
