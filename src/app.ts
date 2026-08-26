import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { authRouter } from "./routes/auth.routes";
import { adminProductRouter, productRouter } from "./routes/product.routes";
import {
  adminDoctorRouter,
  doctorCategoryRouter,
  doctorRouter,
} from "./routes/doctor.routes";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { chatRouter } from "./routes/chat.routes";
import { adminChatRouter } from "./routes/admin-chat.routes";
import { aiRouter } from "./routes/ai.routes";
import { adminConsultationRouter } from "./routes/admin-consultation.routes";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ...(env.NODE_ENV === "test" ? { skip: () => true } : {}),
  }),
);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ok",
      environment: env.NODE_ENV,
      database: "connected",
    });
  } catch {
    res.status(503).json({
      status: "error",
      environment: env.NODE_ENV,
      database: "disconnected",
    });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/admin/products", adminProductRouter);
app.use("/api/doctors", doctorRouter);
app.use("/api/admin/doctors", adminDoctorRouter);
app.use("/api/doctor-categories", doctorCategoryRouter);
app.use("/api/chat", chatRouter);
app.use("/api/admin/chat", adminChatRouter);
app.use("/api/ai", aiRouter);
app.use("/api/food", aiRouter);
app.use("/api/admin/consultations", adminConsultationRouter);

app.use(notFoundHandler);
app.use(errorHandler);
