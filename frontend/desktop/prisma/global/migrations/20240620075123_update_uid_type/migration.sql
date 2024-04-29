/*
  Warnings:

  - Changed the type of `precommitTransactionUid` on the `CommitTransactionSet` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `transactionUid` on the `ErrorPreCommitTransaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "CommitTransactionSet" DROP COLUMN "precommitTransactionUid";
ALTER TABLE "CommitTransactionSet" ADD COLUMN     "precommitTransactionUid" UUID NOT NULL;

-- AlterTable
ALTER TABLE "ErrorPreCommitTransaction" DROP COLUMN "transactionUid";
ALTER TABLE "ErrorPreCommitTransaction" ADD COLUMN     "transactionUid" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CommitTransactionSet_precommitTransactionUid_key" ON "CommitTransactionSet"("precommitTransactionUid");

-- CreateIndex
CREATE UNIQUE INDEX "ErrorPreCommitTransaction_transactionUid_key" ON "ErrorPreCommitTransaction"("transactionUid");
