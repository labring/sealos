-- CreateTable
CREATE TABLE "DeleteUserLog" (
    "userUid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeleteUserLog_pkey" PRIMARY KEY ("userUid")
);
