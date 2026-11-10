-- Additive migration: old clients may continue creating ordinary 5/5 invites.
ALTER TABLE "RegistrationInviteCode" ADD COLUMN "inviterRewardAmount" INT8 NOT NULL DEFAULT 5000000;
ALTER TABLE "RegistrationInviteCode" ADD COLUMN "inviteeRewardAmount" INT8 NOT NULL DEFAULT 5000000;
ALTER TABLE "RegistrationInviteCode" ADD COLUMN "ruleRevision" INT4 NOT NULL DEFAULT 1;
ALTER TABLE "RegistrationInviteCode" ADD COLUMN "remark" TEXT;
ALTER TABLE "RegistrationInviteCode" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RegistrationReferral" ADD COLUMN "inviterRewardAmount" INT8 NOT NULL DEFAULT 5000000;
ALTER TABLE "RegistrationReferral" ADD COLUMN "inviteeRewardAmount" INT8 NOT NULL DEFAULT 5000000;
ALTER TABLE "RegistrationReferral" ADD COLUMN "ruleRevision" INT4 NOT NULL DEFAULT 1;
-- Existing grants are the historical money truth; do not recalculate from today's code.
UPDATE "RegistrationReferral" SET "inviterRewardAmount" = g."amount" FROM "ActivityRewardGrant" g WHERE g."referralId" = "RegistrationReferral"."id" AND g."type" = 'REFERRAL_INVITER';
UPDATE "RegistrationReferral" SET "inviteeRewardAmount" = g."amount" FROM "ActivityRewardGrant" g WHERE g."referralId" = "RegistrationReferral"."id" AND g."type" = 'REFERRAL_INVITEE';
ALTER TABLE "ActivityRewardGrant" ALTER COLUMN "giftCodeId" DROP NOT NULL;
ALTER TABLE "ActivityRewardGrant" ADD COLUMN "accountTransactionId" UUID;
CREATE UNIQUE INDEX "ActivityRewardGrant_accountTransactionId_key" ON "ActivityRewardGrant"("accountTransactionId");
CREATE TYPE "KolActivationStatus" AS ENUM ('UNUSED', 'ACTIVATED', 'REVOKED');
CREATE TABLE "KolActivationCode" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(),
 "codeHash" TEXT NOT NULL,
 "inviterRewardAmount" INT8 NOT NULL,
 "inviteeRewardAmount" INT8 NOT NULL,
 "ruleRevision" INT4 NOT NULL DEFAULT 1,
 "remark" TEXT,
 "status" "KolActivationStatus" NOT NULL DEFAULT 'UNUSED',
 "createdByUid" UUID NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "activatedByUid" UUID,
 "activatedAt" TIMESTAMP(3),
 "revokedAt" TIMESTAMP(3),
 CONSTRAINT "KolActivationCode_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "KolActivationCode_amounts_check" CHECK ("inviterRewardAmount" >= 0 AND "inviteeRewardAmount" >= 0)
);
CREATE UNIQUE INDEX "KolActivationCode_codeHash_key" ON "KolActivationCode"("codeHash");
CREATE UNIQUE INDEX "KolActivationCode_activatedByUid_key" ON "KolActivationCode"("activatedByUid");
CREATE INDEX "KolActivationCode_status_createdAt_idx" ON "KolActivationCode"("status", "createdAt");
