-- CreateTable
CREATE TABLE "UserRealNameInfo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userUid" UUID NOT NULL,
    "realName" STRING,
    "idCard" STRING,
    "phone" STRING,
    "isVerified" BOOL NOT NULL DEFAULT false,
    "idVerifyFailedTimes" INT4 NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "additionalInfo" JSONB,

    CONSTRAINT "UserRealNameInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestrictedUser" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userUid" UUID NOT NULL,
    "restrictedLevel" INT4 NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "additionalInfo" JSONB,

    CONSTRAINT "RestrictedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealNameAuthProvider" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "backend" STRING NOT NULL,
    "authType" STRING NOT NULL,
    "maxFailedTimes" INT4 NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RealNameAuthProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRealNameInfo_userUid_key" ON "UserRealNameInfo"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "RestrictedUser_userUid_key" ON "RestrictedUser"("userUid");
