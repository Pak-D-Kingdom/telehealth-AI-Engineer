import type { RequestHandler } from "express";
import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";
import { AppError } from "../errors/app-error";
import { SESSION_COOKIE_NAME } from "../utils/session";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token || typeof token !== "string") {
    throw new AppError(401, "UNAUTHENTICATED", "Silakan login terlebih dahulu.");
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = await prisma.userSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
    if (session) {
      await prisma.userSession.delete({ where: { id: session.id } }).catch(() => undefined);
    }

    throw new AppError(401, "INVALID_SESSION", "Session tidak valid atau sudah berakhir.");
  }

  req.authUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };

  next();
};
