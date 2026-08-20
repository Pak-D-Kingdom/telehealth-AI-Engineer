import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma";
import { AppError } from "../errors/app-error";
import { SESSION_TTL_MS } from "../utils/session";

const dummyPasswordHash = Bun.password.hash("invalid-login-password", "argon2id");

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function loginAdmin(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  const passwordHash = user?.passwordHash ?? (await dummyPasswordHash);
  const passwordMatches = await Bun.password.verify(password, passwordHash);

  if (!user || !passwordMatches || !user.isActive || user.role !== "ADMIN") {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email atau password salah.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const token = randomBytes(32).toString("base64url");

  await prisma.$transaction([
    prisma.userSession.deleteMany({
      where: { expiresAt: { lte: now } },
    }),
    prisma.userSession.create({
      data: {
        tokenHash: hashSessionToken(token),
        userId: user.id,
        expiresAt,
      },
    }),
  ]);

  return {
    token,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

export async function logoutAdmin(token?: string) {
  if (!token) return;

  await prisma.userSession.deleteMany({
    where: { tokenHash: hashSessionToken(token) },
  });
}
