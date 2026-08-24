CREATE TYPE "BookingActorType" AS ENUM ('PATIENT', 'ADMIN', 'SYSTEM');

ALTER TABLE "consultation_bookings"
ADD COLUMN "pre_consultation_summary" JSONB,
ADD COLUMN "deletion_requested_at" TIMESTAMP(3),
ADD COLUMN "anonymized_at" TIMESTAMP(3);

CREATE TABLE "booking_events" (
  "id" UUID NOT NULL,
  "booking_id" UUID NOT NULL,
  "actor_type" "BookingActorType" NOT NULL,
  "actor_label" VARCHAR(160),
  "action" VARCHAR(80) NOT NULL,
  "previous_status" "BookingStatus",
  "new_status" "BookingStatus",
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consultation_bookings_deletion_requested_at_idx"
ON "consultation_bookings"("deletion_requested_at");

CREATE INDEX "booking_events_booking_id_created_at_idx"
ON "booking_events"("booking_id", "created_at");

ALTER TABLE "booking_events"
ADD CONSTRAINT "booking_events_booking_id_fkey"
FOREIGN KEY ("booking_id") REFERENCES "consultation_bookings"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
