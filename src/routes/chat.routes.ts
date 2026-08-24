import { createHash } from "node:crypto";
import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import {
  currentHistory,
  endSession,
  feedbackMessage,
  historyBySessionId,
  providerStatus,
  retryMessage,
  retryMessageStream,
  sendMessage,
  sendMessageStream,
} from "../controllers/chat.controller";
import {
  cancelBooking,
  createBooking,
  lookupBooking,
  requestBookingDeletion,
  rescheduleBooking,
} from "../controllers/consultation.controller";
import { env } from "../config/env";
import { CHAT_SESSION_COOKIE_NAME } from "../utils/chat-session";

const router = Router();

const chatLimiter = rateLimit({
  windowMs: 2_000,
  limit: 1,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = req.cookies?.[CHAT_SESSION_COOKIE_NAME];
    if (typeof token === "string") {
      return `chat:${createHash("sha256").update(token).digest("hex")}`;
    }
    return `ip:${ipKeyGenerator(req.ip ?? "127.0.0.1")}`;
  },
  message: {
    error: {
      code: "CHAT_RATE_LIMITED",
      message: "Tunggu sebentar sebelum mengirim pesan berikutnya.",
    },
  },
  ...(env.NODE_ENV === "test" ? { skip: () => true } : {}),
});

const bookingLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `booking:${ipKeyGenerator(req.ip ?? "127.0.0.1")}`,
  message: {
    error: {
      code: "BOOKING_RATE_LIMITED",
      message:
        "Terlalu banyak percobaan booking. Tunggu satu menit, lalu coba lagi.",
    },
  },
  ...(env.NODE_ENV === "test" ? { skip: () => true } : {}),
});

router.get("/", currentHistory);
router.get("/status", providerStatus);
router.post("/", chatLimiter, sendMessage);
router.post("/stream", chatLimiter, sendMessageStream);
router.post("/retry", chatLimiter, retryMessage);
router.post("/retry/stream", chatLimiter, retryMessageStream);
router.post("/messages/:messageId/feedback", feedbackMessage);
router.post("/bookings/lookup", bookingLimiter, lookupBooking);
router.patch("/bookings/:bookingCode/cancel", bookingLimiter, cancelBooking);
router.patch(
  "/bookings/:bookingCode/reschedule",
  bookingLimiter,
  rescheduleBooking,
);
router.post(
  "/bookings/:bookingCode/deletion-request",
  bookingLimiter,
  requestBookingDeletion,
);
router.post("/bookings", bookingLimiter, createBooking);
router.delete("/", endSession);
router.get("/:sessionId", historyBySessionId);

export { router as chatRouter };
