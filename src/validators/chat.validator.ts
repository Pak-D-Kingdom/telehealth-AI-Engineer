import { z } from "zod";

export const sendChatSchema = z
  .object({
    message: z.string().trim().max(2_000).default(""),
    image: z.string().optional(),
    session_id: z.string().optional(),
    sessionId: z.string().optional(),
    consentToDataProcessing: z.boolean().optional(),
  })
  .refine((data) => data.message.length > 0 || Boolean(data.image), {
    message: "Pesan atau gambar harus diisi.",
  });

export const retryChatSchema = z.object({
  consentToDataProcessing: z.boolean().optional(),
});

export const chatMessageFeedbackParamsSchema = z.object({
  messageId: z.string().uuid(),
});

export const chatMessageFeedbackSchema = z
  .object({
    rating: z.enum(["HELPFUL", "NOT_HELPFUL"]),
    reason: z
      .enum(["IRRELEVANT", "UNCLEAR", "TOO_LONG", "INCORRECT", "OTHER"])
      .optional(),
    comment: z.string().trim().min(1).max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.rating === "NOT_HELPFUL" && !value.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Pilih alasan mengapa jawaban belum membantu.",
      });
    }
  });

export const chatSessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
});
