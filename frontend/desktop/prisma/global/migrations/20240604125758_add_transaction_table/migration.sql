-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('READY', 'RUNNING', 'FINISH', 'COMMITED', 'ERROR');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('MERGE_USER', 'DELETE_USER');

-- CreateTable
CREATE TABLE "CommitTransactionSet" (
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "precommitTransactionUid" STRING NOT NULL
);

-- CreateTable
CREATE TABLE "PrecommitTransaction" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "infoUid" STRING NOT NULL,
    "status" "TransactionStatus" NOT NULL,

    CONSTRAINT "PrecommitTransaction_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "TransactionDetail" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "regionUid" STRING NOT NULL,
    "transactionUid" STRING NOT NULL,

    CONSTRAINT "TransactionDetail_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "MergeUserTransactionInfo" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mergeUserUid" STRING NOT NULL,
    "userUid" STRING NOT NULL,

    CONSTRAINT "MergeUserTransactionInfo_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "DeleteUserTransactionInfo" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userUid" STRING NOT NULL,

    CONSTRAINT "DeleteUserTransactionInfo_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommitTransactionSet_precommitTransactionUid_key" ON "CommitTransactionSet"("precommitTransactionUid");

-- CreateIndex
CREATE UNIQUE INDEX "PrecommitTransaction_infoUid_transactionType_key" ON "PrecommitTransaction"("infoUid", "transactionType");

-- CreateIndex
CREATE INDEX "TransactionDetail_regionUid_idx" ON "TransactionDetail"("regionUid");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionDetail_transactionUid_regionUid_key" ON "TransactionDetail"("transactionUid", "regionUid");

-- CreateIndex
CREATE UNIQUE INDEX "MergeUserTransactionInfo_mergeUserUid_key" ON "MergeUserTransactionInfo"("mergeUserUid");

-- CreateIndex
CREATE UNIQUE INDEX "DeleteUserTransactionInfo_userUid_key" ON "DeleteUserTransactionInfo"("userUid");
