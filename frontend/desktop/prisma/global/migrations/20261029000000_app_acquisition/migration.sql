-- CreateTable
CREATE TABLE "AcquisitionHandoff" (
    "tokenHash" STRING NOT NULL,
    "installationTokenHash" STRING,
    "requestId" UUID,
    "installationId" STRING,
    "websiteOrigin" STRING NOT NULL,
    "realm" STRING NOT NULL,
    "payload" JSONB,
    "postedAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "linkedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcquisitionHandoff_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "AcquisitionIdentity" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "userUid" UUID NOT NULL,
    "realm" STRING NOT NULL,
    "installationId" STRING NOT NULL,
    "visitorId" STRING,
    "websiteOrigin" STRING NOT NULL,
    "payload" JSONB NOT NULL,
    "journeyStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcquisitionIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAnalyticsEvent" (
    "eventId" STRING NOT NULL,
    "subjectId" UUID,
    "realm" STRING NOT NULL,
    "installationId" STRING,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" STRING NOT NULL DEFAULT 'PENDING',
    "attempts" INT4 NOT NULL DEFAULT 0,
    "leaseUntil" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAnalyticsEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcquisitionHandoff_installationTokenHash_key" ON "AcquisitionHandoff"("installationTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AcquisitionHandoff_requestId_key" ON "AcquisitionHandoff"("requestId");

-- CreateIndex
CREATE INDEX "AcquisitionHandoff_expiresAt_idx" ON "AcquisitionHandoff"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AcquisitionIdentity_requestId_key" ON "AcquisitionIdentity"("requestId");

-- CreateIndex
CREATE INDEX "AcquisitionIdentity_realm_userUid_linkedAt_idx" ON "AcquisitionIdentity"("realm", "userUid", "linkedAt");

-- CreateIndex
CREATE INDEX "AcquisitionIdentity_installationId_linkedAt_idx" ON "AcquisitionIdentity"("installationId", "linkedAt");

-- CreateIndex
CREATE INDEX "ProductAnalyticsEvent_status_leaseUntil_createdAt_idx" ON "ProductAnalyticsEvent"("status", "leaseUntil", "createdAt");
