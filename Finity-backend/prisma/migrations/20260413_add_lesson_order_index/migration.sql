ALTER TABLE "public"."lessons"
ADD COLUMN IF NOT EXISTS "order_index" INTEGER NOT NULL DEFAULT 0;

WITH ordered_lessons AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY topic_id
      ORDER BY created_at ASC, id ASC
    ) AS next_order_index
  FROM "public"."lessons"
)
UPDATE "public"."lessons" AS lessons
SET "order_index" = ordered_lessons.next_order_index
FROM ordered_lessons
WHERE lessons.id = ordered_lessons.id;

CREATE INDEX IF NOT EXISTS "idx_lessons_topic_order"
ON "public"."lessons"("topic_id", "order_index");