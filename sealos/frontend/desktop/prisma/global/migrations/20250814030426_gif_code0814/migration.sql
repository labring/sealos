-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('EXTERNAL_USER', 'INTERNAL_EMPLOYEE');

-- CreateEnum
CREATE TYPE "ProductSeries" AS ENUM ('SEALOS', 'FASTGPT', 'LAF_SEALAF', 'AI_PROXY');

-- CreateEnum
CREATE TYPE "RechargeCodeType" AS ENUM ('TEST_RECHARGE', 'COMPENSATION_RECHARGE', 'ACTIVITY_RECHARGE', 'CORPORATE_RECHARGE');

-- CreateTable
CREATE TABLE "UserAccountType" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userUid" UUID NOT NULL,
    "userType" "UserType" NOT NULL DEFAULT 'EXTERNAL_USER',
    "productSeries" "ProductSeries"[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserAccountType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCodeCreation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "giftCodeId" UUID NOT NULL,
    "createdByUserUid" UUID NOT NULL,
    "rechargeType" "RechargeCodeType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCodeCreation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccountType_userUid_key" ON "UserAccountType"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCodeCreation_giftCodeId_key" ON "GiftCodeCreation"("giftCodeId");
