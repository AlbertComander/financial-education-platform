-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "answers" (
    "id" BIGSERIAL NOT NULL,
    "question_id" BIGINT NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competencies" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_blocks" (
    "id" BIGSERIAL NOT NULL,
    "lesson_id" BIGINT NOT NULL,
    "block_type" TEXT NOT NULL,
    "block_content" JSONB NOT NULL DEFAULT '{}',
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lesson_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" BIGSERIAL NOT NULL,
    "topic_id" BIGINT NOT NULL,
    "lesson_type" TEXT NOT NULL DEFAULT 'lesson',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "difficulty" SMALLINT NOT NULL DEFAULT 1,
    "estimated_minutes" SMALLINT NOT NULL DEFAULT 5,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" BIGSERIAL NOT NULL,
    "quiz_id" BIGINT NOT NULL,
    "text" TEXT NOT NULL,
    "q_type" TEXT NOT NULL DEFAULT 'single',
    "config_json" JSONB NOT NULL DEFAULT '{}',
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" BIGSERIAL NOT NULL,
    "lesson_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by" BIGINT,
    "user_agent" TEXT,
    "ip" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_choices" (
    "id" BIGSERIAL NOT NULL,
    "step_id" BIGINT NOT NULL,
    "text" TEXT NOT NULL,
    "next_step_id" BIGINT,
    "score_delta" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "explanation_text" TEXT,

    CONSTRAINT "scenario_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_steps" (
    "id" BIGSERIAL NOT NULL,
    "scenario_id" BIGINT NOT NULL,
    "step_index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "scenario_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" BIGSERIAL NOT NULL,
    "topic_id" BIGINT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_runs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "tool_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputs_json" JSONB NOT NULL DEFAULT '{}',
    "outputs_json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "tool_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" BIGSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_competencies" (
    "topic_id" BIGINT NOT NULL,
    "competency_id" BIGINT NOT NULL,
    "weight" DECIMAL(6,3) NOT NULL DEFAULT 1.0,

    CONSTRAINT "topic_competencies_pkey" PRIMARY KEY ("topic_id","competency_id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" SMALLINT NOT NULL DEFAULT 1,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_answers" (
    "id" BIGSERIAL NOT NULL,
    "attempt_id" BIGINT NOT NULL,
    "question_id" BIGINT NOT NULL,
    "selected_answer_ids" JSONB NOT NULL DEFAULT '[]',
    "submitted_payload" JSONB NOT NULL DEFAULT '{}',
    "is_correct" BOOLEAN,

    CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_competency_state" (
    "user_id" BIGINT NOT NULL,
    "competency_id" BIGINT NOT NULL,
    "level" SMALLINT NOT NULL DEFAULT 0,
    "source" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_competency_state_pkey" PRIMARY KEY ("user_id","competency_id")
);

-- CreateTable
CREATE TABLE "user_events" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" BIGINT,
    "meta_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_lesson_progress" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "lesson_id" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "progress_percent" SMALLINT NOT NULL DEFAULT 0,
    "last_opened_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_quick_questions" (
    "id" BIGSERIAL NOT NULL,
    "lesson_id" BIGINT NOT NULL,
    "text" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_quick_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_quick_answers" (
    "id" BIGSERIAL NOT NULL,
    "question_id" BIGINT NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "feedback_text" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_quick_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_lesson_quick_answers" (
    "user_id" BIGINT NOT NULL,
    "lesson_id" BIGINT NOT NULL,
    "question_id" BIGINT NOT NULL,
    "answer_id" BIGINT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "answered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_lesson_quick_answers_pkey" PRIMARY KEY ("user_id","question_id")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "user_id" BIGINT NOT NULL,
    "display_name" TEXT,
    "goal" TEXT,
    "experience_lvl" SMALLINT,
    "base_params" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_quiz_attempts" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "quiz_id" BIGINT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "score" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "max_score" DECIMAL(6,2) NOT NULL DEFAULT 0,

    CONSTRAINT "user_quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_scenario_actions" (
    "id" BIGSERIAL NOT NULL,
    "run_id" BIGINT NOT NULL,
    "step_id" BIGINT NOT NULL,
    "choice_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_scenario_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_scenario_runs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "scenario_id" BIGINT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "total_score" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'in_progress',

    CONSTRAINT "user_scenario_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" BIGINT NOT NULL,
    "ui_lang" TEXT NOT NULL DEFAULT 'ru',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "personalization_level" SMALLINT NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_answers_question" ON "answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "competencies_code_key" ON "competencies"("code");

-- CreateIndex
CREATE INDEX "idx_lessons_topic" ON "lessons"("topic_id");

-- CreateIndex
CREATE INDEX "idx_questions_quiz" ON "questions"("quiz_id");

-- CreateIndex
CREATE INDEX "idx_quizzes_lesson" ON "quizzes"("lesson_id");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_exp" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_hash" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_choices_step" ON "scenario_choices"("step_id");

-- CreateIndex
CREATE INDEX "idx_steps_scenario" ON "scenario_steps"("scenario_id");

-- CreateIndex
CREATE UNIQUE INDEX "scenario_steps_scenario_id_step_index_key" ON "scenario_steps"("scenario_id", "step_index");

-- CreateIndex
CREATE INDEX "idx_scenarios_topic" ON "scenarios"("topic_id");

-- CreateIndex
CREATE INDEX "idx_tool_runs_tool" ON "tool_runs"("tool_id");

-- CreateIndex
CREATE INDEX "idx_tool_runs_user" ON "tool_runs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tools_code_key" ON "tools"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_answers_attempt_id_question_id_key" ON "user_answers"("attempt_id", "question_id");

-- CreateIndex
CREATE INDEX "idx_events_type_time" ON "user_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "idx_events_user_time" ON "user_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_progress_lesson" ON "user_lesson_progress"("lesson_id");

-- CreateIndex
CREATE INDEX "idx_progress_user" ON "user_lesson_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_lesson_progress_user_id_lesson_id_key" ON "user_lesson_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "idx_quick_questions_lesson" ON "lesson_quick_questions"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_quick_questions_lesson_id_order_index_key" ON "lesson_quick_questions"("lesson_id", "order_index");

-- CreateIndex
CREATE INDEX "idx_quick_answers_question" ON "lesson_quick_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_quick_answers_question_id_text_key" ON "lesson_quick_answers"("question_id", "text");

-- CreateIndex
CREATE INDEX "idx_quick_user_lesson" ON "user_lesson_quick_answers"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "idx_attempts_quiz" ON "user_quiz_attempts"("quiz_id");

-- CreateIndex
CREATE INDEX "idx_attempts_user" ON "user_quiz_attempts"("user_id");

-- CreateIndex
CREATE INDEX "idx_actions_run" ON "user_scenario_actions"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_scenario_actions_run_id_step_id_key" ON "user_scenario_actions"("run_id", "step_id");

-- CreateIndex
CREATE INDEX "idx_runs_user" ON "user_scenario_runs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_blocks" ADD CONSTRAINT "lesson_blocks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_fkey" FOREIGN KEY ("replaced_by") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "scenario_choices" ADD CONSTRAINT "scenario_choices_next_step_id_fkey" FOREIGN KEY ("next_step_id") REFERENCES "scenario_steps"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "scenario_choices" ADD CONSTRAINT "scenario_choices_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "scenario_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "scenario_steps" ADD CONSTRAINT "scenario_steps_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tool_runs" ADD CONSTRAINT "tool_runs_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tool_runs" ADD CONSTRAINT "tool_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "topic_competencies" ADD CONSTRAINT "topic_competencies_competency_id_fkey" FOREIGN KEY ("competency_id") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "topic_competencies" ADD CONSTRAINT "topic_competencies_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "user_quiz_attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_competency_state" ADD CONSTRAINT "user_competency_state_competency_id_fkey" FOREIGN KEY ("competency_id") REFERENCES "competencies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_competency_state" ADD CONSTRAINT "user_competency_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_quick_questions" ADD CONSTRAINT "lesson_quick_questions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_quick_answers" ADD CONSTRAINT "lesson_quick_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "lesson_quick_questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_lesson_quick_answers" ADD CONSTRAINT "user_lesson_quick_answers_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "lesson_quick_answers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_lesson_quick_answers" ADD CONSTRAINT "user_lesson_quick_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "lesson_quick_questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_lesson_quick_answers" ADD CONSTRAINT "user_lesson_quick_answers_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_lesson_quick_answers" ADD CONSTRAINT "user_lesson_quick_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_quiz_attempts" ADD CONSTRAINT "user_quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_quiz_attempts" ADD CONSTRAINT "user_quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_scenario_actions" ADD CONSTRAINT "user_scenario_actions_choice_id_fkey" FOREIGN KEY ("choice_id") REFERENCES "scenario_choices"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_scenario_actions" ADD CONSTRAINT "user_scenario_actions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "user_scenario_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_scenario_actions" ADD CONSTRAINT "user_scenario_actions_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "scenario_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_scenario_runs" ADD CONSTRAINT "user_scenario_runs_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_scenario_runs" ADD CONSTRAINT "user_scenario_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
