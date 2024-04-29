-- AlterEnum
ALTER TYPE "ProviderType" ADD VALUE 'OAUTH2';

-- CreateTable
CREATE TABLE "InviteReward" (
    "payment_id" STRING NOT NULL,
    "userUid" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_amount" INT8 NOT NULL,
    "reward_amount" INT8 NOT NULL,
    "inviteFrom" UUID NOT NULL,

    CONSTRAINT "InviteReward_pkey" PRIMARY KEY ("payment_id")
);
