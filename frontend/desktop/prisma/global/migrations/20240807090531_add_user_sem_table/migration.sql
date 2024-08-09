-- CreateTable
CREATE TABLE "UserSemChannel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userUid" UUID NOT NULL,
    "channel" STRING NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "additionalInfo" JSONB,

    CONSTRAINT "UserSemChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSemChannel_userUid_key" ON "UserSemChannel"("userUid");
