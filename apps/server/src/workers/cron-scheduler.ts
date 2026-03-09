import * as cron from "node-cron";
import { logger } from "../lib/logger";
import { executeCostFetchJob } from "./cost-fetch.job";

let task: ReturnType<typeof cron.schedule> | null = null;

/**
 * Fallback cron scheduler when Redis/BullMQ is unavailable.
 * Runs every 6 hours to fetch costs for all active cloud accounts.
 */
export function startCronScheduler(): void {
    // Every 6 hours: 0 */6 * * *
    task = cron.schedule("0 */6 * * *", async () => {
        logger.info("Starting scheduled cost fetch (cron)...");
        try {
            const result = await executeCostFetchJob();
            logger.info(`Scheduled cost fetch complete — ${result.accountsProcessed} accounts, ${result.alertsTriggered} alerts`);
        } catch (error) {
            logger.error(`Scheduled cost fetch failed: ${(error as Error).message}`);
        }
    });

    logger.info("Fallback cron scheduler started (every 6 hours)");
}

export function stopCronScheduler(): void {
    if (task) {
        task.stop();
        task = null;
    }
}
