-- CreateEnum
CREATE TYPE "OAuthClientType" AS ENUM ('PUBLIC', 'CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "DeviceGrantStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CONSUMED');

-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" STRING NOT NULL,
    "clientType" "OAuthClientType" NOT NULL DEFAULT 'PUBLIC',
    "userUid" UUID,
    "clientSecretHash" STRING,
    "allowedGrantTypes" STRING[] NOT NULL DEFAULT ARRAY[]::STRING[],
    "name" STRING NOT NULL,
    "logoUrl" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthDeviceGrant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" STRING NOT NULL,
    "deviceCodeHash" STRING NOT NULL,
    "userCodeHash" STRING NOT NULL,
    "userUid" UUID,
    "status" "DeviceGrantStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastPollAt" TIMESTAMP(3),
    "pollCount" INT4 NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthDeviceGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthUserConsent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userUid" UUID NOT NULL,
    "clientId" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthUserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_clientId_key" ON "OAuthClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthDeviceGrant_deviceCodeHash_key" ON "OAuthDeviceGrant"("deviceCodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthDeviceGrant_userCodeHash_key" ON "OAuthDeviceGrant"("userCodeHash");

-- CreateIndex
CREATE INDEX "idx_device_grants_client_status_exp" ON "OAuthDeviceGrant"("clientId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "idx_device_grants_user_status_exp" ON "OAuthDeviceGrant"("userUid", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "idx_device_grants_expires" ON "OAuthDeviceGrant"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_consents_user_client" ON "OAuthUserConsent"("userUid", "clientId");

-- CreateIndex
CREATE INDEX "idx_user_consents_client" ON "OAuthUserConsent"("clientId");

-- CreateIndex
CREATE INDEX "idx_user_consents_user" ON "OAuthUserConsent"("userUid");
