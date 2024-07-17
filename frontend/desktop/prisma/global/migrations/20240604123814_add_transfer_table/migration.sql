CREATE TABLE "Transfer" (
    uid uuid default gen_random_uuid () not null primary key,
    "fromUserUid" uuid not null,
    "toUserUid" uuid not null,
    amount bigint not null,
    remark text not null,
    created_at timestamp
    with
        time zone default current_timestamp() not null
);

COMMENT ON TABLE "Transfer" IS 'Calculates sum of squares of the independent variable.';