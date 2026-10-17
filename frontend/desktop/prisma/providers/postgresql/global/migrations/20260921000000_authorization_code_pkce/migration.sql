-- CreateEnum
CREATE TYPE "OAuthClientType" AS ENUM ('PUBLIC', 'CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "DeviceGrantStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CONSUMED');

-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" UUID NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientType" "OAuthClientType" NOT NULL DEFAULT 'PUBLIC',
    "userUid" UUID,
    "clientSecretHash" TEXT,
    "allowedGrantTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "redirectUris" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthDeviceGrant" (
    "id" UUID NOT NULL,
    "clientId" TEXT NOT NULL,
    "deviceCodeHash" TEXT NOT NULL,
    "userCodeHash" TEXT NOT NULL,
    "userUid" UUID,
    "status" "DeviceGrantStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastPollAt" TIMESTAMP(3),
    "pollCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthDeviceGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthUserConsent" (
    "id" UUID NOT NULL,
    "userUid" UUID NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthUserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAuthorizationRequest" (
    "id" UUID NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "browserHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "userUid" UUID,
    "codeHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAuthorizationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthRefreshSession" (
    "id" UUID NOT NULL,
    "clientId" TEXT NOT NULL,
    "userUid" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthRefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthCodeRefreshToken" (
    "hash" TEXT NOT NULL,
    "sessionId" UUID NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthCodeRefreshToken_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "OAuthCodeRateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthCodeRateLimit_pkey" PRIMARY KEY ("key")
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
CREATE INDEX "idx_user_consents_client" ON "OAuthUserConsent"("clientId");

-- CreateIndex
CREATE INDEX "idx_user_consents_user" ON "OAuthUserConsent"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_consents_user_client" ON "OAuthUserConsent"("userUid", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAuthorizationRequest_codeHash_key" ON "OAuthAuthorizationRequest"("codeHash");

-- CreateIndex
CREATE INDEX "OAuthAuthorizationRequest_expiresAt_idx" ON "OAuthAuthorizationRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "OAuthAuthorizationRequest_clientId_idx" ON "OAuthAuthorizationRequest"("clientId");

-- CreateIndex
CREATE INDEX "OAuthRefreshSession_clientId_idx" ON "OAuthRefreshSession"("clientId");

-- CreateIndex
CREATE INDEX "OAuthRefreshSession_userUid_idx" ON "OAuthRefreshSession"("userUid");

-- CreateIndex
CREATE INDEX "OAuthRefreshSession_expiresAt_idx" ON "OAuthRefreshSession"("expiresAt");

-- CreateIndex
CREATE INDEX "OAuthCodeRefreshToken_sessionId_idx" ON "OAuthCodeRefreshToken"("sessionId");

-- CreateIndex
CREATE INDEX "OAuthCodeRateLimit_expiresAt_idx" ON "OAuthCodeRateLimit"("expiresAt");
