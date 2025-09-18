-- CreateEnum
CREATE TYPE "subscription_operator" AS ENUM ('created', 'upgraded', 'downgraded', 'canceled', 'renewed', 'deleted');

-- CreateEnum
CREATE TYPE "subscription_pay_status" AS ENUM ('pending', 'paid', 'no_need', 'failed', 'expired', 'canceled');

-- CreateEnum
CREATE TYPE "subscription_period" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('NORMAL', 'DEBT', 'DEBT_PRE_DELETION', 'DEBT_FINAL_DELETION', 'DELETED', 'PAUSED');

-- CreateEnum
CREATE TYPE "subscription_transaction_status" AS ENUM ('completed', 'pending', 'processing', 'failed');

-- CreateEnum
CREATE TYPE "workspace_traffic_status" AS ENUM ('active', 'exhausted', 'used_up', 'expired');

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "encryptBalance" SET DEFAULT '';
ALTER TABLE "Account" ALTER COLUMN "encryptDeductionBalance" SET DEFAULT '';
ALTER TABLE "Account" ALTER COLUMN "updated_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AccountTransaction" ADD COLUMN     "billing_id_list" STRING[];
ALTER TABLE "AccountTransaction" ADD COLUMN     "credit_id_list" STRING[];
ALTER TABLE "AccountTransaction" ADD COLUMN     "deduction_credit" INT8;
ALTER TABLE "AccountTransaction" ADD COLUMN     "region" UUID;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "activityType" STRING;
ALTER TABLE "Payment" ADD COLUMN     "card_uid" UUID;
ALTER TABLE "Payment" ADD COLUMN     "charge_source" STRING;
ALTER TABLE "Payment" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'PAID';
ALTER TABLE "Payment" ADD COLUMN     "stripe" JSONB;
ALTER TABLE "Payment" ADD COLUMN     "type" STRING;
ALTER TABLE "Payment" ADD COLUMN     "workspace_subscription_id" UUID;

-- CreateTable
CREATE TABLE "AccountRegionUserTask" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "region_domain" STRING(50) NOT NULL,
    "user_uid" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6),
    "type" STRING,
    "start_at" TIMESTAMPTZ(6),
    "end_at" TIMESTAMPTZ(6),
    "status" STRING,

    CONSTRAINT "AccountRegionUserTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardInfo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_uid" UUID NOT NULL,
    "card_no" STRING,
    "card_brand" STRING,
    "card_token" STRING,
    "created_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "network_transaction_id" STRING,
    "default" BOOL DEFAULT false,
    "last_payment_status" STRING,

    CONSTRAINT "CardInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configs" (
    "type" STRING(255),
    "data" JSONB
);

-- CreateTable
CREATE TABLE "Corporate" (
    "user_uid" STRING NOT NULL,
    "id" STRING NOT NULL,
    "receipt_serial_number" STRING NOT NULL,
    "payer_name" STRING(255) NOT NULL,
    "payment_amount" DECIMAL NOT NULL,
    "gift_amount" DECIMAL NOT NULL,
    "pay_date" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "creation_date" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Corporate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_uid" UUID,
    "amount" INT8,
    "used_amount" INT8,
    "from_id" STRING,
    "from_type" STRING,
    "expire_at" TIMESTAMP(6),
    "created_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "start_at" TIMESTAMP(6),
    "status" STRING,
    "updated_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditsTransaction" (
    "id" STRING NOT NULL,
    "user_uid" STRING,
    "account_transaction_id" STRING,
    "region_uid" STRING,
    "credits_id" STRING,
    "used_amount" INT8,
    "created_at" TIMESTAMPTZ(6),
    "reason" STRING,

    CONSTRAINT "CreditsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debt" (
    "user_uid" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "account_debt_status" STRING NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("user_uid")
);

-- CreateTable
CREATE TABLE "DebtResumeDeductionBalanceTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_uid" UUID NOT NULL,
    "before_deduction_balance" INT8 NOT NULL,
    "after_deduction_balance" INT8 NOT NULL,
    "before_balance" INT8 NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtResumeDeductionBalanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtStatusRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_uid" UUID NOT NULL,
    "last_status" STRING,
    "current_status" STRING,
    "create_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtStatusRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" STRING NOT NULL,
    "user_id" STRING NOT NULL,
    "created_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "detail" STRING NOT NULL,
    "remark" STRING,
    "total_amount" INT8 NOT NULL,
    "status" STRING NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "invoice_id" STRING,
    "payment_id" STRING NOT NULL,
    "amount" INT8 NOT NULL,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" STRING NOT NULL,
    "userUid" UUID NOT NULL,
    "regionUid" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "regionUserOwner" STRING,
    "method" STRING NOT NULL,
    "amount" INT8 NOT NULL,
    "gift" INT8,
    "trade_no" STRING NOT NULL,
    "code_url" STRING,
    "invoiced_at" BOOL DEFAULT false,
    "remark" STRING,
    "activityType" STRING,
    "message" STRING NOT NULL,
    "card_uid" UUID,
    "type" STRING,
    "charge_source" STRING,
    "status" STRING NOT NULL,
    "workspace_subscription_id" UUID,
    "stripe" JSONB,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRefund" (
    "trade_no" UUID NOT NULL,
    "id" STRING NOT NULL,
    "method" STRING(255) NOT NULL,
    "refund_no" STRING NOT NULL,
    "refund_amount" DECIMAL NOT NULL,
    "deduct_amount" DECIMAL NOT NULL,
    "created_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "refund_reason" STRING,

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "billing_cycle" STRING(20) NOT NULL,
    "price" INT8,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "stripe_price" STRING(100),
    "original_price" INT8,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" STRING,
    "value" STRING,
    "region" STRING,

    CONSTRAINT "RegionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id" UUID,
    "plan_name" STRING(50),
    "user_uid" UUID NOT NULL,
    "status" STRING(50),
    "start_at" TIMESTAMPTZ(6),
    "update_at" TIMESTAMPTZ(6),
    "expire_at" TIMESTAMPTZ(6),
    "card_id" UUID,
    "next_cycle_date" TIMESTAMPTZ(6),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" STRING NOT NULL,
    "description" STRING,
    "amount" INT8,
    "gift_amount" INT8,
    "period" STRING(50),
    "upgrade_plan_list" STRING[],
    "downgrade_plan_list" STRING[],
    "max_seats" INT8 NOT NULL,
    "max_workspaces" INT8 NOT NULL,
    "max_resources" STRING,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "most_popular" BOOL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscription_id" UUID NOT NULL,
    "user_uid" UUID NOT NULL,
    "old_plan_id" UUID,
    "new_plan_id" UUID,
    "old_plan_name" STRING(50),
    "new_plan_name" STRING(50),
    "old_plan_status" STRING(50),
    "operator" STRING(50),
    "start_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "status" STRING(50),
    "pay_status" STRING(50),
    "pay_id" STRING,
    "amount" INT8,

    CONSTRAINT "SubscriptionTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKYC" (
    "user_uid" UUID NOT NULL,
    "status" STRING(50),
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "next_at" TIMESTAMPTZ(6),

    CONSTRAINT "UserKYC_pkey" PRIMARY KEY ("user_uid")
);

-- CreateTable
CREATE TABLE "UserTimeRangeTraffic" (
    "created_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "next_clean_time" TIMESTAMPTZ(3),
    "user_uid" UUID NOT NULL,
    "sent_bytes" INT8 DEFAULT 0,
    "status" STRING(20) DEFAULT 'processing',

    CONSTRAINT "UserTimeRangeTraffic_pkey" PRIMARY KEY ("user_uid")
);

-- CreateTable
CREATE TABLE "UserTransfer" (
    "id" STRING NOT NULL,
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fromUserUid" UUID NOT NULL,
    "fromUserId" STRING NOT NULL,
    "toUserUid" UUID NOT NULL,
    "toUserId" STRING NOT NULL,
    "amount" INT8 NOT NULL,
    "remark" STRING NOT NULL,
    "created_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTransfer_pkey" PRIMARY KEY ("id","uid")
);

-- CreateTable
CREATE TABLE "WorkspaceSubscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_name" STRING(50),
    "workspace" STRING(50),
    "region_domain" STRING(50),
    "user_uid" UUID,
    "status" "subscription_status",
    "pay_status" "subscription_pay_status",
    "pay_method" STRING,
    "stripe" JSONB,
    "traffic_status" "workspace_traffic_status" DEFAULT 'active',
    "current_period_start_at" TIMESTAMPTZ(6),
    "current_period_end_at" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOL DEFAULT false,
    "cancel_at" TIMESTAMPTZ(6),
    "create_at" TIMESTAMPTZ(6),
    "update_at" TIMESTAMPTZ(6),
    "expire_at" TIMESTAMPTZ(6),

    CONSTRAINT "WorkspaceSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSubscriptionPlan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" STRING NOT NULL,
    "description" STRING,
    "upgrade_plan_list" STRING[],
    "downgrade_plan_list" STRING[],
    "max_seats" INT8 NOT NULL,
    "max_resources" STRING,
    "traffic" INT8,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "tags" STRING[],
    "order" INT8,

    CONSTRAINT "WorkspaceSubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSubscriptionTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from" STRING,
    "workspace" STRING(50) NOT NULL,
    "region_domain" STRING(50) NOT NULL,
    "user_uid" UUID,
    "old_plan_name" STRING(50),
    "new_plan_name" STRING(50),
    "old_plan_status" "subscription_status",
    "operator" "subscription_operator",
    "start_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "status" "subscription_transaction_status",
    "status_desc" STRING(255),
    "pay_status" "subscription_pay_status",
    "pay_id" STRING,
    "period" STRING,
    "amount" INT8,

    CONSTRAINT "WorkspaceSubscriptionTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceTraffic" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "workspace" STRING(50) NOT NULL,
    "region_domain" STRING(50) NOT NULL,
    "workspace_subscription_id" UUID NOT NULL,
    "status" "workspace_traffic_status" DEFAULT 'active',
    "from" STRING(50),
    "from_id" STRING(50),
    "total_bytes" INT8 DEFAULT 0,
    "used_bytes" INT8 DEFAULT 0,

    CONSTRAINT "WorkspaceTraffic_pkey" PRIMARY KEY ("id","workspace_subscription_id")
);

-- CreateTable
CREATE TABLE "distributed_locks" (
    "lock_name" STRING NOT NULL,
    "holder_id" STRING NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INT8 NOT NULL DEFAULT 1,

    CONSTRAINT "distributed_locks_pkey" PRIMARY KEY ("lock_name")
);

-- CreateIndex
CREATE INDEX "idx_AccountRegionUserTask_user_uid" ON "AccountRegionUserTask"("user_uid");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_trade_no_key" ON "PaymentOrder"("trade_no");

-- CreateIndex
CREATE UNIQUE INDEX "idx_product_cycle" ON "ProductPrice"("product_id", "billing_cycle");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_user_uid_key" ON "Subscription"("user_uid");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");

-- CreateIndex
CREATE INDEX "idx_SubscriptionTransaction_subscription_id" ON "SubscriptionTransaction"("subscription_id");

-- CreateIndex
CREATE INDEX "idx_SubscriptionTransaction_user_uid" ON "SubscriptionTransaction"("user_uid");

-- CreateIndex
CREATE UNIQUE INDEX "idx_workspace_region_domain" ON "WorkspaceSubscription"("workspace", "region_domain");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSubscriptionPlan_name_key" ON "WorkspaceSubscriptionPlan"("name");

-- CreateIndex
CREATE INDEX "idx_pending_transactions" ON "WorkspaceSubscriptionTransaction"("pay_status", "start_at", "status", "region_domain");

-- CreateIndex
CREATE INDEX "idx_workspace_region_domain" ON "WorkspaceSubscriptionTransaction"("workspace", "region_domain");

-- CreateIndex
CREATE INDEX "idx_workspace_region_domain" ON "WorkspaceTraffic"("workspace", "region_domain");
