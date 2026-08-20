import { createHash } from "node:crypto";
import type { CookieOptions } from "express";
import { env } from "../config/env";

export const CHAT_SESSION_COOKIE_NAME = "telehealth_chat_session";
export const CHAT_SESSION_TTL_MS = env.CHAT_SESSION_TTL_DAYS * 24 * 60 * 60 * 1_000;

export const chatSessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/chat",
  maxAge: CHAT_SESSION_TTL_MS,
};

export const clearChatSessionCookieOptions: CookieOptions = {
  httpOnly: chatSessionCookieOptions.httpOnly,
  secure: chatSessionCookieOptions.secure,
  sameSite: chatSessionCookieOptions.sameSite,
  path: chatSessionCookieOptions.path,
};

export function hashChatSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
