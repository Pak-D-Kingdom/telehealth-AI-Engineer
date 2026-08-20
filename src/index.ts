import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { initFollowUpCron } from "./cron/follow-up.cron";

const server = app.listen(env.PORT, () => {
  console.log(`Telehealth API is running on http://localhost:${env.PORT}`);
  initFollowUpCron();
});

const shutdown = async (signal: string) => {
  console.log(`${signal} received. Shutting down...`);
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
