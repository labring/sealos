-- CreateEnum
CREATE TYPE "RegistrationSourceType" AS ENUM ('WEB', 'API');
-- CreateEnum
CREATE TYPE "ActivityRewardType" AS ENUM ('DESKTOP_FIRST_LOGIN', 'REFERRAL_INVITER', 'REFERRAL_INVITEE');
-- CreateEnum
CREATE TYPE "ActivityRewardStatus" AS ENUM ('READY', 'REDEEMING', 'REDEEMED', 'RETRYABLE_FAILURE');
-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'INELIGIBLE');

-- CreateTable
CREATE TABLE "RegistrationInviteCode" (
    "id" UUID NOT NULL,
    "inviterUid" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationInviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationReferral" (
    "id" UUID NOT NULL,
    "inviteeUid" UUID NOT NULL,
    "inviterUid" UUID NOT NULL,
    "codeId" UUID NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "ineligibleReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesktopLoginRecord" (
    "userUid" UUID NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientVersion" TEXT,
    "authSource" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesktopLoginRecord_pkey" PRIMARY KEY ("userUid")
);

-- CreateTable
CREATE TABLE "RegistrationSource" (
    "userUid" UUID NOT NULL,
    "source" "RegistrationSourceType" NOT NULL DEFAULT 'WEB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationSource_pkey" PRIMARY KEY ("userUid")
);

-- CreateTable
CREATE TABLE "ActivityRewardGrant" (
    "id" UUID NOT NULL,
    "recipientUid" UUID NOT NULL,
    "type" "ActivityRewardType" NOT NULL,
    "referralId" UUID,
    "businessKey" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "giftCodeId" UUID NOT NULL,
    "status" "ActivityRewardStatus" NOT NULL DEFAULT 'READY',
    "failureReason" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "ruleVersion" TEXT NOT NULL DEFAULT '2026-10-14.1',

    CONSTRAINT "ActivityRewardGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationInviteCode_inviterUid_key" ON "RegistrationInviteCode"("inviterUid");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationInviteCode_code_key" ON "RegistrationInviteCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationReferral_inviteeUid_key" ON "RegistrationReferral"("inviteeUid");

-- CreateIndex
CREATE INDEX "RegistrationReferral_inviterUid_idx" ON "RegistrationReferral"("inviterUid");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityRewardGrant_businessKey_key" ON "ActivityRewardGrant"("businessKey");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityRewardGrant_giftCodeId_key" ON "ActivityRewardGrant"("giftCodeId");

-- CreateIndex
CREATE INDEX "ActivityRewardGrant_recipientUid_status_idx" ON "ActivityRewardGrant"("recipientUid", "status");

-- CreateIndex
CREATE INDEX "ActivityRewardGrant_status_lastAttemptAt_idx" ON "ActivityRewardGrant"("status", "lastAttemptAt");
