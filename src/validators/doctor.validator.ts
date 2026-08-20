import { z } from "zod";
import { activeQueryValue, nullableString, paginationSchema } from "./common";

const doctorFields = {
  slug: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  name: z.string().trim().min(2).max(160),
  specialty: z.string().trim().min(2).max(180),
  experience: z.string().trim().min(2).max(100),
  registrationNumber: nullableString(120),
  image: nullableString(500),
  isActive: z.boolean().optional(),
  categoryIds: z.array(z.string().trim().min(1).max(50)).min(1).max(20),
};

export const createDoctorSchema = z.object(doctorFields);

export const updateDoctorSchema = z
  .object(doctorFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu field harus dikirim.",
  });

export const publicDoctorQuerySchema = paginationSchema.extend({
  categoryId: z.string().trim().max(50).optional(),
});

export const adminDoctorQuerySchema = publicDoctorQuerySchema.extend({
  active: activeQueryValue,
});
