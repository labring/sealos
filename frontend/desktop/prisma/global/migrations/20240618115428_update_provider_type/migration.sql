/*
  Warnings:

  - You are about to drop the column `useruid` on the `AccountTransaction` table. All the data in the column will be lost.
  - Added the required column `userUid` to the `AccountTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ProviderType" ADD VALUE 'EMAIL';

-- AlterTable
ALTER TABLE "AccountTransaction" DROP COLUMN "useruid";
ALTER TABLE "AccountTransaction" ADD COLUMN     "userUid" UUID NOT NULL;
ALTER TABLE "AccountTransaction" ALTER COLUMN "created_at" DROP NOT NULL;
ALTER TABLE "AccountTransaction" ALTER COLUMN "updated_at" DROP NOT NULL;
