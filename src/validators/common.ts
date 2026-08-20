import { z } from "zod";

export const uuidParamsSchema = z.object({
  id: z.string().uuid(),
});

export const identifierParamsSchema = z.object({
  identifier: z.string().trim().min(1).max(160),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(160).optional(),
});

export const nullableString = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

export const activeQueryValue = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();
