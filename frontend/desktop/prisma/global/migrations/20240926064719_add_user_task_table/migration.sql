-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('LAUNCHPAD', 'COSTCENTER', 'DATABASE', 'DESKTOP', 'APPSTORE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_COMPLETED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" STRING NOT NULL,
    "description" STRING NOT NULL,
    "reward" INT8 NOT NULL,
    "order" INT4 NOT NULL,
    "isActive" BOOL NOT NULL DEFAULT true,
    "isNewUserTask" BOOL NOT NULL DEFAULT false,
    "taskType" "TaskType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTask" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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
CREATE INDEX "UserTask_taskId_idx" ON "UserTask"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTask_userUid_taskId_key" ON "UserTask"("userUid", "taskId");
