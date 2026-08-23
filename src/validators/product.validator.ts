import { z } from "zod";
import { activeQueryValue, nullableString, paginationSchema } from "./common";

const productFields = {
  slug: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(120),
  price: z.coerce.number().int().min(0).max(2_000_000_000),
  image: nullableString(500),
  specs: nullableString(2_000),
  description: nullableString(5_000),
  isActive: z.boolean().optional(),
};

export const createProductSchema = z.object(productFields);

export const updateProductSchema = z
  .object(productFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Isi sedikitnya satu data yang ingin diubah.",
  });

export const publicProductQuerySchema = paginationSchema.extend({
  category: z.string().trim().max(120).optional(),
});

export const adminProductQuerySchema = publicProductQuerySchema.extend({
  active: activeQueryValue,
});
