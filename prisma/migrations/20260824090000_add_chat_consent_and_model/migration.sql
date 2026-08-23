ALTER TABLE "chat_sessions"
ADD COLUMN "consent_at" TIMESTAMP(3),
ADD COLUMN "consent_version" VARCHAR(40);

ALTER TABLE "chat_messages"
ADD COLUMN "model_used" VARCHAR(160);
