CREATE TABLE "NativeDeploymentOperation" (
    "operationId" UUID NOT NULL,
    "userUid" UUID NOT NULL,
    "realm" STRING NOT NULL,
    "regionUid" UUID NOT NULL,
    "regionDomain" STRING NOT NULL,
    "workspaceId" STRING NOT NULL,
    "marker" STRING NOT NULL,
    "planHash" STRING NOT NULL,
    "baselines" JSONB NOT NULL,
    "status" STRING NOT NULL DEFAULT 'REGISTERED',
    "eventId" STRING,
    "lastCheck" STRING,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completionRequestedAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    CONSTRAINT "NativeDeploymentOperation_pkey" PRIMARY KEY ("operationId")
);
CREATE INDEX "NativeDeploymentOperation_realm_regionUid_status_expiresAt_idx" ON "NativeDeploymentOperation"("realm", "regionUid", "status", "expiresAt");
CREATE TABLE "NativeDeploymentReceipt" (
    "proofId" STRING NOT NULL,
    "operationId" UUID NOT NULL,
    "userUid" UUID NOT NULL,
    "eventId" STRING NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NativeDeploymentReceipt_pkey" PRIMARY KEY ("proofId")
);
CREATE INDEX "NativeDeploymentReceipt_operationId_idx" ON "NativeDeploymentReceipt"("operationId");
