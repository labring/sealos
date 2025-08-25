-- CreateEnum
CREATE TYPE "TemplateRepositoryKind" AS ENUM ('FRAMEWORK', 'OS', 'LANGUAGE', 'CUSTOM');

-- CreateTable
CREATE TABLE "User" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "regionUid" STRING NOT NULL,
    "namespaceId" STRING NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "isDeleted" BOOL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Organization" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id" STRING NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "isDeleted" BOOL DEFAULT false,
    "name" STRING NOT NULL,

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
    "name" STRING NOT NULL,
    "description" STRING,
    "kind" "TemplateRepositoryKind" NOT NULL,
    "organizationUid" STRING NOT NULL,
    "isPublic" BOOL NOT NULL DEFAULT false,
    "iconId" STRING,
    "isDeleted" BOOL DEFAULT false,

    CONSTRAINT "TemplateRepository_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Template" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" STRING NOT NULL,
    "templateRepositoryUid" STRING NOT NULL,
    "devboxReleaseImage" STRING,
    "image" STRING NOT NULL,
    "config" STRING NOT NULL,
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
    "name" STRING NOT NULL,
    "zhName" STRING,
    "enName" STRING,

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
