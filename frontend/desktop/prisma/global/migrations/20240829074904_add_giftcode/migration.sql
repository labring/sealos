-- CreateTable
CREATE TABLE "GiftCode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" STRING NOT NULL,
    "creditAmount" INT8 NOT NULL DEFAULT 0,
    "used" BOOL NOT NULL DEFAULT false,
    "usedBy" UUID,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiredAt" TIMESTAMP(3),
    "comment" STRING,

    CONSTRAINT "GiftCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftCode_code_key" ON "GiftCode"("code");
