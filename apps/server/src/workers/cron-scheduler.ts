import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { fetchAndStoreCosts } from "../modules/aws/aws-cost.service";
import { evaluateAlerts } from "../modules/alerts/alert.evaluator";

let task: cron.ScheduledTask | null = null;

/**
 * Fallback cron scheduler when Redis/BullMQ is unavailable.
 * Runs every 6 hours to fetch costs for all active cloud accounts.
 */
export function startCronScheduler(): void {
    // Every 6 hours: 0 */6 * * *
    task = cron.schedule("0 */6 * * *", async () => {
        console.log("[Cron] Starting scheduled cost fetch...");

        const accounts = await prisma.cloudAccount.findMany({
            where: { isActive: true },
            select: { id: true, projectId: true, accountLabel: true },
        });

        console.log(`[Cron] Found ${accounts.length} active cloud accounts`);

        const today = new Date();
        const endDate = today.toISOString().split("T")[0];
        const startDate = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

        const projectsToEvaluate = new Set<string>();

        for (const account of accounts) {
            try {
                const result = await fetchAndStoreCosts(account.id, startDate, endDate);
                projectsToEvaluate.add(account.projectId);
                console.log(`[Cron] ✓ ${account.accountLabel}: ${result.recordsUpserted} records`);
            } catch (error) {
                console.error(`[Cron] ✗ ${account.accountLabel}: ${(error as Error).message}`);
            }
        }

        // Evaluate alerts for affected projects
        for (const projectId of projectsToEvaluate) {
            try {
                const triggers = await evaluateAlerts(projectId);
                if (triggers.length > 0) {
                    console.log(`[Cron] 🔔 ${triggers.length} alert(s) triggered for project ${projectId}`);
                }
            } catch (error) {
                console.error(`[Cron] Alert evaluation failed for ${projectId}: ${(error as Error).message}`);
            }
        }

        console.log("[Cron] Scheduled cost fetch complete.");
    });

    console.log("[Cron] Fallback scheduler started (every 6 hours)");
}

export function stopCronScheduler(): void {
    if (task) {
        task.stop();
        task = null;
    }
}
