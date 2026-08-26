CREATE TYPE "ChatFeedbackRating" AS ENUM ('HELPFUL', 'NOT_HELPFUL');
CREATE TYPE "ChatFeedbackReason" AS ENUM ('IRRELEVANT', 'UNCLEAR', 'TOO_LONG', 'INCORRECT', 'OTHER');

ALTER TABLE "chat_messages"
ADD COLUMN "intent" VARCHAR(60),
ADD COLUMN "response_latency_ms" INTEGER,
ADD COLUMN "gateway_latency_ms" INTEGER,
ADD COLUMN "gateway_attempts" INTEGER,
ADD COLUMN "fallback_used" BOOLEAN,
ADD COLUMN "retrieval_status" VARCHAR(40),
ADD COLUMN "retrieval_latency_ms" INTEGER,
ADD COLUMN "retrieval_match_count" INTEGER,
ADD COLUMN "retrieval_top_similarity" DOUBLE PRECISION;

CREATE TABLE "chat_message_feedback" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL,
  "rating" "ChatFeedbackRating" NOT NULL,
  "reason" "ChatFeedbackReason",
  "comment" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "chat_message_feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_message_feedback_message_id_key"
ON "chat_message_feedback"("message_id");

CREATE INDEX "chat_message_feedback_rating_idx"
ON "chat_message_feedback"("rating");

CREATE INDEX "chat_message_feedback_reason_idx"
ON "chat_message_feedback"("reason");

CREATE INDEX "chat_messages_intent_idx"
ON "chat_messages"("intent");

ALTER TABLE "chat_message_feedback"
ADD CONSTRAINT "chat_message_feedback_message_id_fkey"
FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
