import type { CookieOptions } from "express";
import { env } from "../config/env";

export const SESSION_COOKIE_NAME = "telehealth_session";
export const SESSION_TTL_MS = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_TTL_MS,
};

export const clearSessionCookieOptions: CookieOptions = {
  httpOnly: sessionCookieOptions.httpOnly,
  secure: sessionCookieOptions.secure,
  sameSite: sessionCookieOptions.sameSite,
  path: sessionCookieOptions.path,
};
