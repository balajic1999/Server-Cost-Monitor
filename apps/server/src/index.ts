import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { closeRedis } from "./lib/redis";
import { app } from "./app";
import { startCostFetchWorker, stopCostFetchWorker } from "./workers/cost-fetch.worker";
import { startCronScheduler, stopCronScheduler } from "./workers/cron-scheduler";

let usingCronFallback = false;

const server = app.listen(env.PORT, async () => {
  console.log(`Server listening on :${env.PORT}`);

  // Start background workers (BullMQ preferred, node-cron fallback)
  try {
    await startCostFetchWorker();
    console.log("Background workers started (BullMQ)");
  } catch (err) {
    console.warn("BullMQ unavailable, falling back to node-cron:", (err as Error).message);
    startCronScheduler();
    usingCronFallback = true;
  }
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  if (usingCronFallback) {
    stopCronScheduler();
  } else {
    await stopCostFetchWorker();
  }
  await closeRedis();
  await prisma.$disconnect();
  server.close();
});
