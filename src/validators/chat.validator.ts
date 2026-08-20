import { z } from "zod";

export const sendChatSchema = z.object({
  message: z.string().trim().max(2_000).default(""),
  image: z.string().optional(),
  session_id: z.string().optional(),
  sessionId: z.string().optional(),
}).refine((data) => data.message.length > 0 || Boolean(data.image), {
  message: "Pesan atau gambar harus diisi.",
});

export const chatSessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
});
