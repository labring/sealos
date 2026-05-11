-- CreateEnum
CREATE TYPE "TemplateRepositoryKind" AS ENUM ('FRAMEWORK', 'OS', 'LANGUAGE', 'CUSTOM');

-- Ensure gen_random_uuid() exists on PostgreSQL variants (e.g. KingbaseES)
CREATE OR REPLACE FUNCTION public.gen_random_uuid()
RETURNS uuid
LANGUAGE SQL
VOLATILE
AS $func$
  SELECT md5(random()::text || clock_timestamp()::text || txid_current()::text)::uuid;
$func$;

-- CreateTable
CREATE TABLE "User" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "regionUid" TEXT NOT NULL,
    "namespaceId" TEXT NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "isDeleted" BOOL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Organization" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "isDeleted" BOOL DEFAULT false,
    "name" TEXT NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "UserOrganization" (
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "userUid" UUID NOT NULL,
    "organizationUid" UUID NOT NULL,

    CONSTRAINT "UserOrganization_pkey" PRIMARY KEY ("organizationUid","userUid")
);

-- CreateTable
CREATE TABLE "TemplateRepository" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "TemplateRepositoryKind" NOT NULL,
    "organizationUid" TEXT NOT NULL,
    "isPublic" BOOL NOT NULL DEFAULT false,
    "iconId" TEXT,
    "isDeleted" BOOL DEFAULT false,

    CONSTRAINT "TemplateRepository_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Template" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "templateRepositoryUid" TEXT NOT NULL,
    "devboxReleaseImage" TEXT,
    "image" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "parentUid" UUID,
    "isDeleted" BOOL DEFAULT false,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Tag" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "zhName" TEXT,
    "enName" TEXT,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "TemplateRepositoryTag" (
    "templateRepositoryUid" UUID NOT NULL,
    "tagUid" UUID NOT NULL,

    CONSTRAINT "TemplateRepositoryTag_pkey" PRIMARY KEY ("templateRepositoryUid","tagUid")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_isDeleted_regionUid_namespaceId_key" ON "User"("isDeleted", "regionUid", "namespaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_id_key" ON "Organization"("id");

-- CreateIndex
CREATE INDEX "UserOrganization_userUid_idx" ON "UserOrganization"("userUid");

-- CreateIndex
CREATE INDEX "UserOrganization_createdAt_idx" ON "UserOrganization"("createdAt");

-- CreateIndex
CREATE INDEX "TemplateRepository_isDeleted_isPublic_idx" ON "TemplateRepository"("isDeleted", "isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateRepository_isDeleted_name_key" ON "TemplateRepository"("isDeleted", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Template_isDeleted_templateRepositoryUid_name_key" ON "Template"("isDeleted", "templateRepositoryUid", "name");

-- CreateIndex
CREATE INDEX "TemplateRepositoryTag_tagUid_idx" ON "TemplateRepositoryTag"("tagUid");
