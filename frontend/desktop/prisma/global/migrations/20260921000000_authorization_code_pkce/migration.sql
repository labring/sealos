-- AlterTable
ALTER TABLE "OAuthClient" ADD COLUMN     "redirectUris" STRING[] DEFAULT ARRAY[]::STRING[];

-- CreateTable
CREATE TABLE "OAuthAuthorizationRequest" (
    "id" UUID NOT NULL,
    "clientId" STRING NOT NULL,
    "redirectUri" STRING NOT NULL,
    "state" STRING NOT NULL,
    "challenge" STRING NOT NULL,
    "browserHash" STRING NOT NULL,
    "status" STRING NOT NULL DEFAULT 'PENDING',
    "userUid" UUID,
    "codeHash" STRING,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAuthorizationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthRefreshSession" (
    "id" UUID NOT NULL,
    "clientId" STRING NOT NULL,
    "userUid" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthRefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthCodeRefreshToken" (
    "hash" STRING NOT NULL,
    "sessionId" UUID NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthCodeRefreshToken_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "OAuthCodeRateLimit" (
    "key" STRING NOT NULL,
    "count" INT4 NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthCodeRateLimit_pkey" PRIMARY KEY ("key")
);

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
