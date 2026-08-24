import { z } from "zod";
import { paginationSchema } from "./common";

const modeSchema = z.enum(["ONLINE", "OFFLINE"]);
const slotStatusSchema = z.enum(["AVAILABLE", "BOOKED", "BLOCKED"]);
const bookingStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
]);
const bookingCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^GC-\d{8}-[A-F0-9]{6}$/, "Format kode booking tidak sesuai.");

export const doctorScheduleParamsSchema = z.object({
  identifier: z.string().trim().min(1).max(160),
});

export const publicScheduleQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(12),
  mode: modeSchema.optional(),
});

export const createBookingSchema = z.object({
  slotId: z.string().uuid(),
  patientName: z.string().trim().min(2).max(160),
  whatsapp: z.string().trim().min(9).max(40),
  complaint: z.string().trim().max(1_000).optional(),
  consentToBooking: z.literal(true, {
    error: "Centang persetujuan penggunaan data untuk membuat booking.",
  }),
});

export const bookingCodeParamsSchema = z.object({
  bookingCode: bookingCodeSchema,
});

export const bookingLookupSchema = z.object({
  bookingCode: bookingCodeSchema,
  whatsapp: z.string().trim().min(9).max(40),
});

export const bookingAccessSchema = z.object({
  whatsapp: z.string().trim().min(9).max(40),
});

export const bookingRescheduleSchema = bookingAccessSchema.extend({
  slotId: z.string().uuid(),
  consentToBooking: z.literal(true, {
    error: "Centang persetujuan untuk mengubah jadwal booking.",
  }),
});

export const adminBookingListQuerySchema = paginationSchema.extend({
  status: bookingStatusSchema.optional(),
  doctorId: z.string().uuid().optional(),
  mode: modeSchema.optional(),
});

export const updateBookingStatusSchema = z.object({
  status: bookingStatusSchema,
});

export const adminScheduleListQuerySchema = paginationSchema.extend({
  doctorId: z.string().uuid().optional(),
  status: slotStatusSchema.optional(),
  mode: modeSchema.optional(),
});

export const createScheduleSchema = z
  .object({
    doctorId: z.string().uuid(),
    clinicId: z.string().uuid().nullable().optional(),
    mode: modeSchema,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    price: z.coerce.number().int().min(0).max(100_000_000),
    notes: z.string().trim().max(300).optional(),
  })
  .superRefine((value, context) => {
    if (value.endsAt <= value.startsAt) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Waktu selesai harus setelah waktu mulai.",
      });
    }
    if (value.mode === "OFFLINE" && !value.clinicId) {
      context.addIssue({
        code: "custom",
        path: ["clinicId"],
        message: "Pilih lokasi praktik untuk konsultasi tatap muka.",
      });
    }
  });

export const updateScheduleStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "BLOCKED"]),
});
