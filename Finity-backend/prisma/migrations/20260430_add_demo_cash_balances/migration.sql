CREATE TABLE "demo_cash_balances" (
    "account_id" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_cash_balances_pkey" PRIMARY KEY ("account_id","currency")
);

CREATE INDEX "idx_demo_cash_balances_account" ON "demo_cash_balances"("account_id");

ALTER TABLE "demo_cash_balances" ADD CONSTRAINT "demo_cash_balances_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "demo_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

INSERT INTO "demo_cash_balances" ("account_id", "currency", "amount", "updated_at")
SELECT "id", 'RUB', "cash_balance", "updated_at"
FROM "demo_accounts"
ON CONFLICT ("account_id", "currency") DO UPDATE SET
  "amount" = EXCLUDED."amount",
  "updated_at" = EXCLUDED."updated_at";
