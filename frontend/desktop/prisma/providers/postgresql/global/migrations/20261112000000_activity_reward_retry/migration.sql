-- Append-only: the preceding KOL migration has already been applied in test clusters.
ALTER TABLE "RegistrationReferral" ADD COLUMN "rewardCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "RegistrationReferral" SET "rewardCheckedAt" = "registeredAt";
CREATE INDEX "RegistrationReferral_rewardCheckedAt_id_idx" ON "RegistrationReferral"("rewardCheckedAt", "id");
CREATE INDEX "RegistrationReferral_inviterUid_rewardCheckedAt_id_idx" ON "RegistrationReferral"("inviterUid", "rewardCheckedAt", "id");
-- Abort on invalid historical values; never silently rewrite monetary snapshots.
ALTER TABLE "RegistrationInviteCode" ADD CONSTRAINT "RegistrationInviteCode_amounts_check" CHECK ("inviterRewardAmount" >= 0 AND "inviteeRewardAmount" >= 0);
ALTER TABLE "RegistrationReferral" ADD CONSTRAINT "RegistrationReferral_amounts_check" CHECK ("inviterRewardAmount" >= 0 AND "inviteeRewardAmount" >= 0);
