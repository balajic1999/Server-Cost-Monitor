import { Queue, Worker, QueueScheduler } from "bullmq";
import { getRedis } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { fetchAndStoreCosts } from "../modules/aws/aws-cost.service";
import { evaluateAlerts } from "../modules/alerts/alert.evaluator";

const QUEUE_NAME = "cost-fetch";

let queue: Queue | null = null;
let worker: Worker | null = null;

/**
 * Initialize the BullMQ queue and worker for scheduled cost fetching.
 */
export async function startCostFetchWorker(): Promise<void> {
    const connection = getRedis();

    queue = new Queue(QUEUE_NAME, { connection });

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

    console.log("[Worker] Cost fetch job scheduled (every 6 hours)");

    worker = new Worker(
        QUEUE_NAME,
        async (job) => {
            console.log(`[Worker] Processing job: ${job.name} (${job.id})`);

            // Get all active cloud accounts
            const accounts = await prisma.cloudAccount.findMany({
                where: { isActive: true },
                select: { id: true, projectId: true, accountLabel: true },
            });

            console.log(`[Worker] Found ${accounts.length} active cloud accounts`);

            const today = new Date();
            const endDate = today.toISOString().split("T")[0];
            // Fetch last 2 days to catch any delayed data
            const startDate = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0];

            const results = [];
            const projectsToEvaluate = new Set<string>();

            for (const account of accounts) {
                try {
                    const result = await fetchAndStoreCosts(account.id, startDate, endDate);
                    results.push({ accountId: account.id, label: account.accountLabel, ...result });
                    projectsToEvaluate.add(account.projectId);
                    console.log(`[Worker] ✓ ${account.accountLabel}: ${result.recordsUpserted} records`);
                } catch (error) {
                    console.error(`[Worker] ✗ ${account.accountLabel}: ${(error as Error).message}`);
                    results.push({ accountId: account.id, label: account.accountLabel, error: (error as Error).message });
                }
            }

            // Evaluate alerts for all affected projects
            for (const projectId of projectsToEvaluate) {
                try {
                    const triggers = await evaluateAlerts(projectId);
                    if (triggers.length > 0) {
                        console.log(`[Worker] 🔔 ${triggers.length} alert(s) triggered for project ${projectId}`);
                    }
                } catch (error) {
                    console.error(`[Worker] Alert evaluation failed for project ${projectId}: ${(error as Error).message}`);
                }
            }

            return { accountsProcessed: accounts.length, results };
        },
        {
            connection,
            concurrency: 1, // Process one job at a time
        }
    );

    worker.on("completed", (job) => {
        console.log(`[Worker] Job ${job?.id} completed`);
    });

    worker.on("failed", (job, err) => {
        console.error(`[Worker] Job ${job?.id} failed:`, err.message);
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
