import { z } from "zod";

export const sendChatSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
});

export const chatSessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
});
