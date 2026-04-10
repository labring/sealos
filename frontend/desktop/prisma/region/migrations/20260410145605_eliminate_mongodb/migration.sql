-- CreateTable
CREATE TABLE "VerificationCodes" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userUid" UUID,
    "scenario" STRING NOT NULL,
    "providerType" STRING NOT NULL,
    "providerId" STRING NOT NULL,
    "code" STRING NOT NULL,
    "flowToken" STRING,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VerificationCodes_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "OAuthVerifications" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" STRING NOT NULL,
    "scenario" STRING NOT NULL,
    "providerId" STRING,
    "code" STRING NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OAuthVerifications_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "WorkspaceInvitations" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceUid" UUID NOT NULL,
    "inviterUid" UUID NOT NULL,
    "inviterCrUid" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "invitationCode" STRING NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WorkspaceInvitations_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCodes_flowToken_key" ON "VerificationCodes"("flowToken");

-- CreateIndex
CREATE INDEX "VerificationCodes_expiresAt_idx" ON "VerificationCodes"("expiresAt");

-- CreateIndex
CREATE INDEX "VerificationCodes_scenario_code_idx" ON "VerificationCodes"("scenario", "code");

-- CreateIndex
CREATE INDEX "VerificationCodes_scenario_providerType_providerId_expiresA_idx" ON "VerificationCodes"("scenario", "providerType", "providerId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCodes_scenario_providerType_providerId_key" ON "VerificationCodes"("scenario", "providerType", "providerId");

-- CreateIndex
CREATE INDEX "OAuthVerifications_provider_providerId_idx" ON "OAuthVerifications"("provider", "providerId");

-- CreateIndex
CREATE INDEX "OAuthVerifications_expiresAt_idx" ON "OAuthVerifications"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthVerifications_provider_code_key" ON "OAuthVerifications"("provider", "code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitations_invitationCode_key" ON "WorkspaceInvitations"("invitationCode");

-- CreateIndex
CREATE INDEX "WorkspaceInvitations_expiresAt_idx" ON "WorkspaceInvitations"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitations_workspaceUid_inviterUid_inviterCrUid_r_key" ON "WorkspaceInvitations"("workspaceUid", "inviterUid", "inviterCrUid", "role");
