import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { login, logout, me } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";
import { env } from "../config/env";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_LOGIN_ATTEMPTS",
      message: "Terlalu banyak percobaan login. Silakan coba kembali nanti.",
    },
  },
  ...(env.NODE_ENV === "test" ? { skip: () => true } : {}),
});

router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export { router as authRouter };
