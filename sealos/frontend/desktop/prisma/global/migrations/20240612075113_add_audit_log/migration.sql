-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('UPDATE', 'DELETE', 'CREATE');

-- CreateTable
CREATE TABLE "AuditLog" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entityUid" STRING NOT NULL,
    "entityName" STRING NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "AuditAction" NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "AuditLogDetail" (
    "auditLogUid" STRING NOT NULL,
    "key" STRING NOT NULL,
    "preValue" STRING NOT NULL,
    "newValue" STRING NOT NULL,

    CONSTRAINT "AuditLogDetail_pkey" PRIMARY KEY ("auditLogUid")
);
