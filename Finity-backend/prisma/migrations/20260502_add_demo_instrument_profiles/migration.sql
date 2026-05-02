ALTER TABLE "demo_instruments"
  ADD COLUMN "country" TEXT,
  ADD COLUMN "isin" TEXT,
  ADD COLUMN "website_url" TEXT,
  ADD COLUMN "logo_url" TEXT,
  ADD COLUMN "description" TEXT;

CREATE TABLE "demo_instrument_metrics" (
  "id" BIGSERIAL NOT NULL,
  "instrument_id" BIGINT NOT NULL,
  "section" TEXT NOT NULL DEFAULT 'key',
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "hint" TEXT,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "demo_instrument_metrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demo_instrument_dividends" (
  "id" BIGSERIAL NOT NULL,
  "instrument_id" BIGINT NOT NULL,
  "record_date" DATE NOT NULL,
  "amount" DECIMAL(18, 6) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "yield_percent" DECIMAL(10, 4),
  "period" TEXT,
  "declared_at" DATE,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "demo_instrument_dividends_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_demo_instrument_metrics_order"
  ON "demo_instrument_metrics"("instrument_id", "order_index");

CREATE INDEX "idx_demo_instrument_dividends_date"
  ON "demo_instrument_dividends"("instrument_id", "record_date");

ALTER TABLE "demo_instrument_metrics"
  ADD CONSTRAINT "demo_instrument_metrics_instrument_id_fkey"
  FOREIGN KEY ("instrument_id") REFERENCES "demo_instruments"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "demo_instrument_dividends"
  ADD CONSTRAINT "demo_instrument_dividends_instrument_id_fkey"
  FOREIGN KEY ("instrument_id") REFERENCES "demo_instruments"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
