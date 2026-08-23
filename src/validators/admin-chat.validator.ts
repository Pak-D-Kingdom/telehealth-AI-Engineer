import { z } from "zod";
import { paginationSchema } from "./common";

const booleanQueryValue = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

export const adminChatListQuerySchema = paginationSchema.extend({
  status: z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]).optional(),
  emergency: booleanQueryValue,
  leadCaptured: booleanQueryValue,
});

export const updateAdminChatSchema = z
  .object({
    status: z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]).optional(),
    qualificationStatus: z
      .enum(["ELIGIBLE", "NEEDS_REVIEW", "NOT_ELIGIBLE"])
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Pilih sedikitnya satu data yang ingin diubah.",
  });
