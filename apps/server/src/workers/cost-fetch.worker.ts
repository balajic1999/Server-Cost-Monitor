import { Queue, Worker } from "bullmq";
import { getRedis } from "../lib/redis";
import { logger } from "../lib/logger";
import { executeCostFetchJob } from "./cost-fetch.job";

const QUEUE_NAME = "cost-fetch";

let queue: Queue | null = null;
let worker: Worker | null = null;

/**
 * Initialize the BullMQ queue and worker for scheduled cost fetching.
 */
export async function startCostFetchWorker(): Promise<void> {
    const connection = getRedis();

    queue = new Queue(QUEUE_NAME, { connection: connection as any });

    // Add repeatable job: every 6 hours
    await queue.add(
        "fetch-all-costs",
        {},
        {
            repeat: {
                every: 6 * 60 * 60 * 1000, // 6 hours in ms
            },
            removeOnComplete: { count: 50 },
            removeOnFail: { count: 100 },
        }
    );

    logger.info("Cost fetch job scheduled (every 6 hours via BullMQ)");

    worker = new Worker(
        QUEUE_NAME,
        async (job) => {
            logger.info(`Processing job: ${job.name}`, { jobId: job.id });
            return await executeCostFetchJob();
        },
        {
            connection: connection as any,
            concurrency: 1, // Process one job at a time
        }
    );

    worker.on("completed", (job) => {
        logger.info(`Job ${job?.id} completed`);
    });

    worker.on("failed", (job, err) => {
        // Explicit critical logging for dead-lettered jobs to ensure they aren't missed
        logger.error(`[CRITICAL] Background Job DEAD-LETTERED: ${job?.name} (${job?.id})`, {
            error: err.message,
            stack: err.stack,
            failedReason: job?.failedReason,
            attempts: job?.attemptsMade
        });
    });
}

/**
 * Gracefully shut down the worker.
 */
export async function stopCostFetchWorker(): Promise<void> {
    if (worker) {
        await worker.close();
        worker = null;
    }
    if (queue) {
        await queue.close();
        queue = null;
    }
}
