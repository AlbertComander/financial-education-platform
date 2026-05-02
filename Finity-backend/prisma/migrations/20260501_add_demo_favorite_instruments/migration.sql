CREATE TABLE IF NOT EXISTS "demo_favorite_instruments" (
    "user_id" BIGINT NOT NULL,
    "instrument_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_favorite_instruments_pkey" PRIMARY KEY ("user_id","instrument_id")
);

CREATE INDEX IF NOT EXISTS "idx_demo_favorite_instruments_instrument" ON "demo_favorite_instruments"("instrument_id");

ALTER TABLE "demo_favorite_instruments"
ADD CONSTRAINT "demo_favorite_instruments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "demo_favorite_instruments"
ADD CONSTRAINT "demo_favorite_instruments_instrument_id_fkey"
FOREIGN KEY ("instrument_id") REFERENCES "demo_instruments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
