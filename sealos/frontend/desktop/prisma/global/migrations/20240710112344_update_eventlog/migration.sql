-- CreateTable
CREATE TABLE "EventLog" (
    "uid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mainId" STRING NOT NULL,
    "eventName" STRING NOT NULL,
    "data" STRING NOT NULL,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("uid")
);
