-- CreateTable
CREATE TABLE "EnterpriseRealNameInfo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userUid" UUID NOT NULL,
    "enterpriseName" STRING,
    "enterpriseQualification" STRING,
    "legalRepresentativePhone" STRING,
    "isVerified" BOOL NOT NULL DEFAULT false,
    "verificationStatus" STRING,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "additionalInfo" JSONB,
    "supportingMaterials" JSONB,

    CONSTRAINT "EnterpriseRealNameInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseRealNameInfo_userUid_key" ON "EnterpriseRealNameInfo"("userUid");
