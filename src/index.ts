import express from "express";
import { prisma } from "./lib/prisma";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      environment: process.env.NODE_ENV || "development",
      database: "connected",
    });
  } catch {
    res.status(503).json({
      status: "error",
      environment: process.env.NODE_ENV || "development",
      database: "disconnected",
    });
  }
});

const server = app.listen(port, () => {
  console.log(`Telehealth API is running on http://localhost:${port}`);
});

const shutdown = async (signal: string) => {
  console.log(`${signal} received. Shutting down...`);
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
