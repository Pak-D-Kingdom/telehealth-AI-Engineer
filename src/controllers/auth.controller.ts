import type { RequestHandler } from "express";
import { loginSchema } from "../validators/auth.validator";
import { loginAdmin, logoutAdmin } from "../services/auth.service";
import {
  clearSessionCookieOptions,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "../utils/session";

export const login: RequestHandler = async (req, res) => {
  const credentials = loginSchema.parse(req.body);
  const result = await loginAdmin(credentials.email, credentials.password);

  res.cookie(SESSION_COOKIE_NAME, result.token, sessionCookieOptions);
  res.status(200).json({
    data: {
      user: result.user,
      expiresAt: result.expiresAt,
    },
  });
};

export const logout: RequestHandler = async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  await logoutAdmin(typeof token === "string" ? token : undefined);
  res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions);
  res.status(204).send();
};

export const me: RequestHandler = (req, res) => {
  res.status(200).json({ data: { user: req.authUser } });
};
