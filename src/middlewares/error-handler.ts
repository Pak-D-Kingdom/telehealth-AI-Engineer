import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";

interface PrismaLikeError {
  code?: string;
  meta?: unknown;
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(
    new AppError(
      404,
      "ROUTE_NOT_FOUND",
      "Halaman atau layanan yang diminta tidak ditemukan.",
    ),
  );
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    const retryAfterSeconds = readRetryAfterSeconds(error.details);
    if (retryAfterSeconds) {
      res.setHeader("Retry-After", retryAfterSeconds.toString());
    }

    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Data yang dikirim belum lengkap atau tidak sesuai.",
        details: error.flatten(),
      },
    });
    return;
  }

  const prismaError = error as PrismaLikeError;

  if (prismaError.code === "P2002") {
    res.status(409).json({
      error: {
        code: "DUPLICATE_RESOURCE",
        message: "Data yang sama sudah tersedia. Periksa kembali isian Anda.",
        details: prismaError.meta,
      },
    });
    return;
  }

  if (prismaError.code === "P2025") {
    res.status(404).json({
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Data yang diminta tidak ditemukan.",
      },
    });
    return;
  }

  if (prismaError.code === "P2003" || prismaError.code === "P2023") {
    res.status(422).json({
      error: {
        code: "INVALID_RELATION",
        message: "Pilihan data tidak valid. Periksa kembali isian Anda.",
      },
    });
    return;
  }

  console.error(`[${req.method} ${req.originalUrl}]`, error);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Layanan sedang mengalami gangguan. Silakan coba lagi.",
    },
  });
};

function readRetryAfterSeconds(details: unknown) {
  if (!details || typeof details !== "object" || !("retryAfterSeconds" in details)) {
    return undefined;
  }

  const value = details.retryAfterSeconds;
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.ceil(value)
    : undefined;
}
