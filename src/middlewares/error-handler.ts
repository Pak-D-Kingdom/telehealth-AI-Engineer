import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";

interface PrismaLikeError {
  code?: string;
  meta?: unknown;
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    new AppError(
      404,
      "ROUTE_NOT_FOUND",
      `Route ${req.method} ${req.originalUrl} tidak ditemukan.`,
    ),
  );
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
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
        message: "Data request tidak valid.",
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
        message: "Data dengan nilai unik tersebut sudah tersedia.",
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
        message: "Relasi atau identifier data tidak valid.",
      },
    });
    return;
  }

  console.error(`[${req.method} ${req.originalUrl}]`, error);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan pada server.",
    },
  });
};
