/*
  Warnings:

  - A unique constraint covering the columns `[userUid]` on the table `RestrictedUser` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userUid]` on the table `UserRealNameInfo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `maxFailedTimes` to the `RealNameAuthProvider` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RealNameAuthProvider" ADD COLUMN     "maxFailedTimes" INT4 NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RestrictedUser_userUid_key" ON "RestrictedUser"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "UserRealNameInfo_userUid_key" ON "UserRealNameInfo"("userUid");
