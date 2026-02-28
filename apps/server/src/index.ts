import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { logger } from "./lib/logger";
import { closeRedis } from "./lib/redis";
import { app } from "./app";
import { startCostFetchWorker, stopCostFetchWorker } from "./workers/cost-fetch.worker";
import { startCronScheduler, stopCronScheduler } from "./workers/cron-scheduler";

let usingCronFallback = false;

const server = app.listen(env.PORT, async () => {
  logger.info(`Server listening on :${env.PORT}`);

  // Start background workers (BullMQ preferred, node-cron fallback)
  try {
    await startCostFetchWorker();
    logger.info("Background workers started (BullMQ)");
  } catch (err) {
    logger.warn(`BullMQ unavailable, falling back to node-cron: ${(err as Error).message}`);
    startCronScheduler();
    usingCronFallback = true;
  }
});

async function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully...`);

  // 1. Stop accepting new connections
  server.close(() => logger.info("HTTP server closed"));

  // 2. Stop background workers
  if (usingCronFallback) {
    stopCronScheduler();
  } else {
    await stopCostFetchWorker();
  }
  logger.info("Background workers stopped");

  // 3. Close data connections
  await closeRedis();
  await prisma.$disconnect();
  logger.info("Database and Redis disconnected — exit");

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
