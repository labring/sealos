-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('PHONE', 'GITHUB', 'WECHAT', 'GOOGLE', 'PASSWORD');

-- CreateTable
CREATE TABLE "OauthProvider" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userUid" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "providerType" "ProviderType" NOT NULL,
    "providerId" STRING NOT NULL,
    "password" STRING,

    CONSTRAINT "OauthProvider_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Region" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "displayName" STRING NOT NULL,
    "location" STRING NOT NULL,
    "domain" STRING NOT NULL,
    "description" STRING,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Account" (
    "userUid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityBonus" INT8 NOT NULL,
    "encryptBalance" STRING NOT NULL,
    "encryptDeductionBalance" STRING NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "create_region_id" STRING NOT NULL,
    "balance" INT8,
    "deduction_balance" INT8,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("userUid")
);

-- CreateTable
CREATE TABLE "ErrorPaymentCreate" (
    "userUid" UUID NOT NULL,
    "regionUid" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regionUserOwner" STRING NOT NULL,
    "method" STRING NOT NULL,
    "amount" INT8 NOT NULL,
    "gift" INT8,
    "trade_no" STRING NOT NULL,
    "code_url" STRING,
    "invoiced_at" BOOL DEFAULT false,
    "remark" STRING,
    "message" STRING NOT NULL,
    "create_time" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" STRING NOT NULL,
    "userUid" UUID NOT NULL,
    "regionUid" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regionUserOwner" STRING NOT NULL,
    "method" STRING NOT NULL,
    "amount" INT8 NOT NULL,
    "gift" INT8,
    "trade_no" STRING NOT NULL,
    "code_url" STRING,
    "invoiced_at" BOOL DEFAULT false,
    "remark" STRING,
    "message" STRING NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferAccountV1" (
    "regionUid" UUID NOT NULL,
    "regionUserOwner" STRING NOT NULL,
    "userUid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityBonus" INT8 NOT NULL,
    "encryptBalance" STRING NOT NULL,
    "encryptDeductionBalance" STRING NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "create_region_id" STRING NOT NULL,
    "balance" INT8,
    "deduction_balance" INT8,

    CONSTRAINT "TransferAccountV1_pkey" PRIMARY KEY ("userUid")
);

-- CreateTable
CREATE TABLE "User" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "avatarUri" STRING NOT NULL,
    "nickname" STRING NOT NULL,
    "id" STRING NOT NULL,
    "name" STRING NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "ErrorAccountCreate" (
    "userUid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityBonus" INT8 NOT NULL,
    "encryptBalance" STRING NOT NULL,
    "encryptDeductionBalance" STRING NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "create_region_id" STRING NOT NULL,
    "balance" INT8,
    "deduction_balance" INT8,
    "userCr" STRING NOT NULL,
    "error_time" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regionUid" UUID NOT NULL,
    "regionUserOwner" STRING NOT NULL,
    "message" STRING NOT NULL,

    CONSTRAINT "ErrorAccountCreate_pkey" PRIMARY KEY ("userUid")
);

-- CreateTable
CREATE TABLE "NullUserRecord" (
    "crName" STRING NOT NULL,
    "region_id" STRING NOT NULL
);

-- CreateIndex
CREATE INDEX "OauthProvider_userUid_idx" ON "OauthProvider"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "OauthProvider_providerId_providerType_key" ON "OauthProvider"("providerId", "providerType");

-- CreateIndex
CREATE UNIQUE INDEX "ErrorPaymentCreate_trade_no_key" ON "ErrorPaymentCreate"("trade_no");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_trade_no_key" ON "Payment"("trade_no");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ErrorAccountCreate_userCr_key" ON "ErrorAccountCreate"("userCr");

-- CreateIndex
CREATE UNIQUE INDEX "NullUserRecord_crName_key" ON "NullUserRecord"("crName");
