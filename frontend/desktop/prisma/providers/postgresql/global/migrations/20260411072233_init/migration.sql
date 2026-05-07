-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('EXTERNAL_USER', 'INTERNAL_EMPLOYEE');

-- CreateEnum
CREATE TYPE "ProductSeries" AS ENUM ('SEALOS', 'FASTGPT', 'LAF_SEALAF', 'AI_PROXY');

-- CreateEnum
CREATE TYPE "RechargeCodeType" AS ENUM ('TEST_RECHARGE', 'COMPENSATION_RECHARGE', 'ACTIVITY_RECHARGE', 'CORPORATE_RECHARGE');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('PHONE', 'GITHUB', 'WECHAT', 'GOOGLE', 'PASSWORD', 'OAUTH2', 'EMAIL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('READY', 'RUNNING', 'FINISH', 'COMMITED', 'ERROR');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('MERGE_USER', 'DELETE_USER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('UPDATE', 'DELETE', 'CREATE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('NORMAL_USER', 'LOCK_USER', 'DELETE_USER');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('LAUNCHPAD', 'COSTCENTER', 'DATABASE', 'DESKTOP', 'APPSTORE', 'CRONJOB', 'DEVBOX', 'CONTACT', 'REAL_NAME_AUTH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_COMPLETED', 'COMPLETED');

-- CreateTable
CREATE TABLE "OauthProvider" (
    "uid" UUID NOT NULL,
    "userUid" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "providerType" "ProviderType" NOT NULL,
    "providerId" TEXT NOT NULL,
    "password" TEXT,

    CONSTRAINT "OauthProvider_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Region" (
    "uid" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Account" (
    "userUid" UUID NOT NULL,
    "activityBonus" BIGINT NOT NULL,
    "encryptBalance" TEXT NOT NULL,
    "encryptDeductionBalance" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "create_region_id" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "balance" BIGINT,
    "deduction_balance" BIGINT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("userUid")
);

-- CreateTable
CREATE TABLE "AccountTransaction" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "userUid" UUID NOT NULL,
    "deduction_balance" BIGINT NOT NULL,
    "deduction_balance_before" BIGINT,
    "balance" BIGINT NOT NULL,
    "balance_before" BIGINT,
    "message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billing_id" UUID NOT NULL,

    CONSTRAINT "AccountTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_info" (
    "id" UUID NOT NULL,
    "user_uid" UUID NOT NULL,
    "sign_up_region_uid" UUID NOT NULL,
    "is_inited" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,

    CONSTRAINT "user_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_usage" (
    "id" UUID NOT NULL,
    "user_uid" UUID NOT NULL,
    "workspace_uid" UUID NOT NULL,
    "region_uid" UUID NOT NULL,
    "seat" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workspace_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorPaymentCreate" (
    "userUid" UUID NOT NULL,
    "regionUid" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regionUserOwner" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "gift" BIGINT,
    "trade_no" TEXT NOT NULL,
    "code_url" TEXT,
    "invoiced_at" BOOLEAN DEFAULT false,
    "remark" TEXT,
    "message" TEXT NOT NULL,
    "create_time" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userUid" UUID NOT NULL,
    "regionUid" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regionUserOwner" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "gift" BIGINT,
    "trade_no" TEXT NOT NULL,
    "code_url" TEXT,
    "invoiced_at" BOOLEAN DEFAULT false,
    "remark" TEXT,
    "message" TEXT NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "uid" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "avatarUri" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'NORMAL_USER',

    CONSTRAINT "User_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "uid" UUID NOT NULL,
    "fromUserUid" UUID NOT NULL,
    "toUserUid" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "remark" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "ErrorAccountCreate" (
    "userUid" UUID NOT NULL,
    "activityBonus" BIGINT NOT NULL,
    "encryptBalance" TEXT NOT NULL,
    "encryptDeductionBalance" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "create_region_id" TEXT NOT NULL,
    "balance" BIGINT,
    "deduction_balance" BIGINT,
    "userCr" TEXT NOT NULL,
    "error_time" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regionUid" UUID NOT NULL,
    "regionUserOwner" TEXT NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "ErrorAccountCreate_pkey" PRIMARY KEY ("userUid")
);

-- CreateTable
CREATE TABLE "CommitTransactionSet" (
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "precommitTransactionUid" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "PrecommitTransaction" (
    "uid" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "infoUid" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL,

    CONSTRAINT "PrecommitTransaction_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "ErrorPreCommitTransaction" (
    "uid" UUID NOT NULL,
    "transactionUid" UUID NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorPreCommitTransaction_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "TransactionDetail" (
    "uid" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "regionUid" TEXT NOT NULL,
    "transactionUid" TEXT NOT NULL,

    CONSTRAINT "TransactionDetail_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "MergeUserTransactionInfo" (
    "uid" UUID NOT NULL,
    "mergeUserUid" TEXT NOT NULL,
    "userUid" TEXT NOT NULL,

    CONSTRAINT "MergeUserTransactionInfo_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "DeleteUserTransactionInfo" (
    "uid" UUID NOT NULL,
    "userUid" TEXT NOT NULL,

    CONSTRAINT "DeleteUserTransactionInfo_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "DeleteUserLog" (
    "userUid" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeleteUserLog_pkey" PRIMARY KEY ("userUid")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "uid" UUID NOT NULL,
    "entityUid" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "AuditAction" NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "AuditLogDetail" (
    "auditLogUid" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "preValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,

    CONSTRAINT "AuditLogDetail_pkey" PRIMARY KEY ("auditLogUid")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "uid" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mainId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "InviteReward" (
    "payment_id" TEXT NOT NULL,
    "userUid" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_amount" BIGINT NOT NULL,
    "reward_amount" BIGINT NOT NULL,
    "inviteFrom" UUID NOT NULL,

    CONSTRAINT "InviteReward_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "UserRealNameInfo" (
    "id" UUID NOT NULL,
    "userUid" UUID NOT NULL,
    "realName" TEXT,
    "idCard" TEXT,
    "phone" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "idVerifyFailedTimes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "additionalInfo" JSONB,

    CONSTRAINT "UserRealNameInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseRealNameInfo" (
    "id" UUID NOT NULL,
    "userUid" UUID NOT NULL,
    "enterpriseName" TEXT,
    "enterpriseQualification" TEXT,
    "legalRepresentativePhone" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "additionalInfo" JSONB,
    "supportingMaterials" JSONB,

    CONSTRAINT "EnterpriseRealNameInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestrictedUser" (
    "id" UUID NOT NULL,
    "userUid" UUID NOT NULL,
    "restrictedLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "additionalInfo" JSONB,

    CONSTRAINT "RestrictedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealNameAuthProvider" (
    "id" UUID NOT NULL,
    "backend" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "maxFailedTimes" INTEGER NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RealNameAuthProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSemChannel" (
    "id" UUID NOT NULL,
    "userUid" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "additionalInfo" JSONB,

    CONSTRAINT "UserSemChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCode" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "creditAmount" BIGINT NOT NULL DEFAULT 0,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedBy" UUID,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiredAt" TIMESTAMP(3),
    "comment" TEXT,

    CONSTRAINT "GiftCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccountType" (
    "id" UUID NOT NULL,
    "userUid" UUID NOT NULL,
    "userType" "UserType" NOT NULL DEFAULT 'EXTERNAL_USER',
    "productSeries" "ProductSeries"[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserAccountType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCodeCreation" (
    "id" UUID NOT NULL,
    "giftCodeId" UUID NOT NULL,
    "createdByUserUid" UUID NOT NULL,
    "rechargeType" "RechargeCodeType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCodeCreation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reward" BIGINT NOT NULL,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isNewUserTask" BOOLEAN NOT NULL DEFAULT false,
    "taskType" "TaskType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTask" (
    "id" UUID NOT NULL,
    "userUid" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "rewardStatus" "TaskStatus" NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OauthProvider_userUid_idx" ON "OauthProvider"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "OauthProvider_providerId_providerType_key" ON "OauthProvider"("providerId", "providerType");

-- CreateIndex
CREATE UNIQUE INDEX "user_info_user_uid_key" ON "user_info"("user_uid");

-- CreateIndex
CREATE INDEX "workspace_usage_user_uid_idx" ON "workspace_usage"("user_uid");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_usage_region_uid_user_uid_workspace_uid_key" ON "workspace_usage"("region_uid", "user_uid", "workspace_uid");

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
CREATE UNIQUE INDEX "CommitTransactionSet_precommitTransactionUid_key" ON "CommitTransactionSet"("precommitTransactionUid");

-- CreateIndex
CREATE UNIQUE INDEX "PrecommitTransaction_infoUid_transactionType_key" ON "PrecommitTransaction"("infoUid", "transactionType");

-- CreateIndex
CREATE UNIQUE INDEX "ErrorPreCommitTransaction_transactionUid_key" ON "ErrorPreCommitTransaction"("transactionUid");

-- CreateIndex
CREATE INDEX "TransactionDetail_regionUid_idx" ON "TransactionDetail"("regionUid");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionDetail_transactionUid_regionUid_key" ON "TransactionDetail"("transactionUid", "regionUid");

-- CreateIndex
CREATE UNIQUE INDEX "MergeUserTransactionInfo_mergeUserUid_key" ON "MergeUserTransactionInfo"("mergeUserUid");

-- CreateIndex
CREATE INDEX "MergeUserTransactionInfo_userUid_idx" ON "MergeUserTransactionInfo"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "DeleteUserTransactionInfo_userUid_key" ON "DeleteUserTransactionInfo"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "UserRealNameInfo_userUid_key" ON "UserRealNameInfo"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseRealNameInfo_userUid_key" ON "EnterpriseRealNameInfo"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "RestrictedUser_userUid_key" ON "RestrictedUser"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "UserSemChannel_userUid_key" ON "UserSemChannel"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCode_code_key" ON "GiftCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccountType_userUid_key" ON "UserAccountType"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCodeCreation_giftCodeId_key" ON "GiftCodeCreation"("giftCodeId");

-- CreateIndex
CREATE INDEX "UserTask_taskId_idx" ON "UserTask"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTask_userUid_taskId_key" ON "UserTask"("userUid", "taskId");
