-- CreateEnum
CREATE TYPE "ConsultationMode" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "ScheduleSlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "clinics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "address" TEXT NOT NULL,
    "whatsapp" VARCHAR(40),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_schedule_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "clinic_id" UUID,
    "mode" "ConsultationMode" NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "price" INTEGER NOT NULL,
    "status" "ScheduleSlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_code" VARCHAR(32) NOT NULL,
    "session_id" UUID,
    "doctor_id" UUID NOT NULL,
    "slot_id" UUID NOT NULL,
    "patient_name" VARCHAR(160) NOT NULL,
    "whatsapp" VARCHAR(40) NOT NULL,
    "complaint" VARCHAR(1000),
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "consent_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinics_slug_key" ON "clinics"("slug");
CREATE INDEX "clinics_city_idx" ON "clinics"("city");
CREATE INDEX "clinics_is_active_idx" ON "clinics"("is_active");
CREATE UNIQUE INDEX "doctor_schedule_slots_doctor_id_starts_at_key" ON "doctor_schedule_slots"("doctor_id", "starts_at");
CREATE INDEX "doctor_schedule_slots_status_starts_at_idx" ON "doctor_schedule_slots"("status", "starts_at");
CREATE INDEX "doctor_schedule_slots_clinic_id_idx" ON "doctor_schedule_slots"("clinic_id");
CREATE UNIQUE INDEX "consultation_bookings_booking_code_key" ON "consultation_bookings"("booking_code");
CREATE INDEX "consultation_bookings_slot_id_status_idx" ON "consultation_bookings"("slot_id", "status");
CREATE INDEX "consultation_bookings_doctor_id_created_at_idx" ON "consultation_bookings"("doctor_id", "created_at");
CREATE INDEX "consultation_bookings_session_id_idx" ON "consultation_bookings"("session_id");
CREATE INDEX "consultation_bookings_status_created_at_idx" ON "consultation_bookings"("status", "created_at");

-- AddForeignKey
ALTER TABLE "doctor_schedule_slots" ADD CONSTRAINT "doctor_schedule_slots_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "doctor_schedule_slots" ADD CONSTRAINT "doctor_schedule_slots_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consultation_bookings" ADD CONSTRAINT "consultation_bookings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consultation_bookings" ADD CONSTRAINT "consultation_bookings_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consultation_bookings" ADD CONSTRAINT "consultation_bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "doctor_schedule_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
