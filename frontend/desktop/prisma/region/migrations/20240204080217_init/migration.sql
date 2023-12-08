-- CreateEnum
CREATE TYPE "JoinStatus" AS ENUM ('INVITED', 'IN_WORKSPACE', 'NOT_IN_WORKSPACE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MANAGER', 'DEVELOPER', 'OWNER');

-- CreateTable
CREATE TABLE "Workspace" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id" STRING NOT NULL,
    "displayName" STRING NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "UserCr" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "crName" STRING NOT NULL,
    "userUid" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "UserCr_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "UserWorkspace" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "workspaceUid" UUID NOT NULL,
    "userCrUid" UUID NOT NULL,
    "handlerUid" UUID,
    "role" "Role" NOT NULL DEFAULT 'DEVELOPER',
    "status" "JoinStatus" NOT NULL,
    "isPrivate" BOOL NOT NULL,
    "joinAt" TIMESTAMPTZ(3),

    CONSTRAINT "UserWorkspace_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCr_crName_key" ON "UserCr"("crName");

-- CreateIndex
CREATE UNIQUE INDEX "UserCr_userUid_key" ON "UserCr"("userUid");

-- CreateIndex
CREATE INDEX "UserWorkspace_userCrUid_idx" ON "UserWorkspace"("userCrUid");

-- CreateIndex
CREATE UNIQUE INDEX "UserWorkspace_workspaceUid_userCrUid_key" ON "UserWorkspace"("workspaceUid", "userCrUid");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_id_key" ON "Workspace"("id");