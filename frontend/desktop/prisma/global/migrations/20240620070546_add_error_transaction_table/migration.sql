-- CreateTable
CREATE TABLE "ErrorPreCommitTransaction" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transactionUid" STRING NOT NULL,
    "reason" STRING,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorPreCommitTransaction_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "ErrorPreCommitTransaction_transactionUid_key" ON "ErrorPreCommitTransaction"("transactionUid");
