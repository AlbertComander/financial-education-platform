ALTER TABLE "questions"
ADD COLUMN IF NOT EXISTS "config_json" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "user_answers"
ADD COLUMN IF NOT EXISTS "submitted_payload" JSONB NOT NULL DEFAULT '{}'::jsonb;
