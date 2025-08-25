-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('NORMAL_USER', 'LOCK_USER', 'DELETE_USER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'NORMAL_USER';
