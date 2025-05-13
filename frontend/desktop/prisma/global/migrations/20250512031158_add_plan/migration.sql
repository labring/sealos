-- CreateTable
CREATE TABLE "user_info" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_uid" UUID NOT NULL,
    "sign_up_region_uid" UUID NOT NULL,
    "is_inited" BOOL NOT NULL DEFAULT false,
    "config" JSONB,

    CONSTRAINT "user_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_uid" UUID NOT NULL,
    "workspace_uid" UUID NOT NULL,
    "region_uid" UUID NOT NULL,
    "seat" INT4 NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workspace_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_info_user_uid_key" ON "user_info"("user_uid");

-- CreateIndex
CREATE INDEX "workspace_usage_user_uid_idx" ON "workspace_usage"("user_uid");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_usage_region_uid_user_uid_workspace_uid_key" ON "workspace_usage"("region_uid", "user_uid", "workspace_uid");
