create table "AccountTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid (),
    "type" TEXT NOT NULL,
    "deduction_balance" INT8 NOT NULL,
    "balance" INT8 NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMPTZ (3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ (3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billing_id" UUID NOT NULL,
    "userUid" UUID NOT NULL,
    CONSTRAINT "AccountTransaction_pkey" PRIMARY KEY ("id")
);