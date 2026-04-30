CREATE TABLE "demo_accounts" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Демо-счет',
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "cash_balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demo_cash_transactions" (
    "id" BIGSERIAL NOT NULL,
    "account_id" BIGINT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "description" TEXT,
    "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_cash_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demo_income_rules" (
    "id" BIGSERIAL NOT NULL,
    "account_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "day_of_month" SMALLINT NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "next_run_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_income_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demo_instruments" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchange" TEXT,
    "sector" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'stooq',
    "provider_symbol" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_instruments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demo_price_cache" (
    "instrument_id" BIGINT NOT NULL,
    "price" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "change_abs" DECIMAL(18,6),
    "change_percent" DECIMAL(10,4),
    "as_of" TIMESTAMPTZ(6) NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stooq',
    "raw_json" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_price_cache_pkey" PRIMARY KEY ("instrument_id")
);

CREATE TABLE "demo_positions" (
    "account_id" BIGINT NOT NULL,
    "instrument_id" BIGINT NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "avg_price" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_positions_pkey" PRIMARY KEY ("account_id","instrument_id")
);

CREATE TABLE "demo_trades" (
    "id" BIGSERIAL NOT NULL,
    "account_id" BIGINT NOT NULL,
    "instrument_id" BIGINT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL,
    "price" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "commission" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "executed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_trades_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demo_portfolio_snapshots" (
    "id" BIGSERIAL NOT NULL,
    "account_id" BIGINT NOT NULL,
    "cash_value" DECIMAL(18,4) NOT NULL,
    "positions_value" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_value" DECIMAL(18,4) NOT NULL,
    "invested_value" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "snapshot_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_portfolio_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "demo_accounts_user_id_key" ON "demo_accounts"("user_id");
CREATE UNIQUE INDEX "demo_instruments_code_key" ON "demo_instruments"("code");
CREATE INDEX "idx_demo_accounts_user" ON "demo_accounts"("user_id");
CREATE INDEX "idx_demo_cash_transactions_account_time" ON "demo_cash_transactions"("account_id", "effective_at");
CREATE INDEX "idx_demo_income_rules_account_active" ON "demo_income_rules"("account_id", "is_active");
CREATE INDEX "idx_demo_instruments_asset_type" ON "demo_instruments"("asset_type");
CREATE INDEX "idx_demo_instruments_symbol" ON "demo_instruments"("symbol");
CREATE INDEX "idx_demo_positions_instrument" ON "demo_positions"("instrument_id");
CREATE INDEX "idx_demo_trades_account_time" ON "demo_trades"("account_id", "executed_at");
CREATE INDEX "idx_demo_trades_instrument" ON "demo_trades"("instrument_id");
CREATE INDEX "idx_demo_snapshots_account_time" ON "demo_portfolio_snapshots"("account_id", "snapshot_at");

ALTER TABLE "demo_accounts" ADD CONSTRAINT "demo_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "demo_cash_transactions" ADD CONSTRAINT "demo_cash_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "demo_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "demo_income_rules" ADD CONSTRAINT "demo_income_rules_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "demo_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "demo_price_cache" ADD CONSTRAINT "demo_price_cache_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "demo_instruments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "demo_positions" ADD CONSTRAINT "demo_positions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "demo_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "demo_positions" ADD CONSTRAINT "demo_positions_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "demo_instruments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "demo_trades" ADD CONSTRAINT "demo_trades_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "demo_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "demo_trades" ADD CONSTRAINT "demo_trades_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "demo_instruments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "demo_portfolio_snapshots" ADD CONSTRAINT "demo_portfolio_snapshots_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "demo_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
