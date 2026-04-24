-- CreateEnum
CREATE TYPE "JoinStatus" AS ENUM ('INVITED', 'IN_WORKSPACE', 'NOT_IN_WORKSPACE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MANAGER', 'DEVELOPER', 'OWNER');

-- CreateTable
CREATE TABLE "Workspace" (
    "uid" UUID NOT NULL,
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "UserCr" (
    "uid" UUID NOT NULL,
    "crName" TEXT NOT NULL,
    "userUid" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserCr_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "UserWorkspace" (
    "uid" UUID NOT NULL,
    "alias" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "workspaceUid" UUID NOT NULL,
    "userCrUid" UUID NOT NULL,
    "handlerUid" UUID,
    "role" "Role" NOT NULL DEFAULT 'DEVELOPER',
    "status" "JoinStatus" NOT NULL,
    "isPrivate" BOOLEAN NOT NULL,
    "joinAt" TIMESTAMPTZ(3),

    CONSTRAINT "UserWorkspace_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "VerificationCodes" (
    "uid" UUID NOT NULL,
    "userUid" UUID,
    "scenario" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "flowToken" TEXT,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "VerificationCodes_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "OAuthVerifications" (
    "uid" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "providerId" TEXT,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OAuthVerifications_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "WorkspaceInvitations" (
    "uid" UUID NOT NULL,
    "workspaceUid" UUID NOT NULL,
    "inviterUid" UUID NOT NULL,
    "inviterCrUid" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "invitationCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WorkspaceInvitations_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_id_key" ON "Workspace"("id");

-- CreateIndex
CREATE UNIQUE INDEX "UserCr_crName_key" ON "UserCr"("crName");

-- CreateIndex
CREATE UNIQUE INDEX "UserCr_userUid_key" ON "UserCr"("userUid");

-- CreateIndex
CREATE INDEX "UserWorkspace_userCrUid_idx" ON "UserWorkspace"("userCrUid");

-- CreateIndex
CREATE UNIQUE INDEX "UserWorkspace_workspaceUid_userCrUid_key" ON "UserWorkspace"("workspaceUid", "userCrUid");

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
