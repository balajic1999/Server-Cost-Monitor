import { prisma } from "../lib/prisma";
import { fetchAndStoreCosts, invalidateCostSummaryCache } from "../modules/aws/aws-cost.service";
import { evaluateAlerts } from "../modules/alerts/alert.evaluator";
import { logger } from "../lib/logger";

export interface CostFetchResult {
    accountId: string;
    label: string;
    success: boolean;
    recordsUpserted?: number;
    error?: string;
}

export interface CostFetchJobResult {
    accountsProcessed: number;
    results: CostFetchResult[];
    alertsTriggered: number;
}

/**
 * Shared cost fetch logic used by both BullMQ worker and cron fallback.
 * Fetches costs for all active cloud accounts and evaluates alert rules.
 */
export async function executeCostFetchJob(): Promise<CostFetchJobResult> {
    const accounts = await prisma.cloudAccount.findMany({
        where: { isActive: true },
        select: { id: true, projectId: true, accountLabel: true },
    });

    logger.info(`Cost fetch job started — ${accounts.length} active cloud accounts`);

    const today = new Date();
    const endDate = today.toISOString().split("T")[0];
    // Fetch last 2 days to catch any delayed data
    const startDate = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    const results: CostFetchResult[] = [];
    const projectsToEvaluate = new Set<string>();

    for (const account of accounts) {
        try {
            const result = await fetchAndStoreCosts(account.id, startDate, endDate);
            results.push({
                accountId: account.id,
                label: account.accountLabel,
                success: true,
                recordsUpserted: result.recordsUpserted,
            });
            projectsToEvaluate.add(account.projectId);
            // Invalidate cached cost summary for this project
            await invalidateCostSummaryCache(account.projectId);
            logger.info(`✓ ${account.accountLabel}: ${result.recordsUpserted} records`);
        } catch (error) {
            const msg = (error as Error).message;
            logger.error(`✗ ${account.accountLabel}: ${msg}`);
            results.push({
                accountId: account.id,
                label: account.accountLabel,
                success: false,
                error: msg,
            });
        }
    }

    // Evaluate alerts for all affected projects
    let alertsTriggered = 0;
    for (const projectId of projectsToEvaluate) {
        try {
            const triggers = await evaluateAlerts(projectId);
            alertsTriggered += triggers.length;
            if (triggers.length > 0) {
                logger.info(`🔔 ${triggers.length} alert(s) triggered for project ${projectId}`);
            }
        } catch (error) {
            logger.error(`Alert evaluation failed for project ${projectId}: ${(error as Error).message}`);
        }
    }

    logger.info(`Cost fetch job complete — ${accounts.length} accounts, ${alertsTriggered} alerts`);

    return { accountsProcessed: accounts.length, results, alertsTriggered };
}
