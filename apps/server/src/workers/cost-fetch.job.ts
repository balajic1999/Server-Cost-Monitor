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

// Concurrency cap for per-account cloud-API calls. Cost Explorer / GCP Billing /
// Azure Cost Management all rate-limit per account, so 5 in-flight is a safe
// default that's ~5× faster than serial without risking 429s.
const COST_FETCH_CONCURRENCY = 5;

async function processAccount(
    account: { id: string; projectId: string; accountLabel: string },
    startDate: string,
    endDate: string,
): Promise<CostFetchResult> {
    try {
        const result = await fetchAndStoreCosts(account.id, startDate, endDate);
        await invalidateCostSummaryCache(account.projectId);
        logger.info(`✓ ${account.accountLabel}: ${result.recordsUpserted} records`);
        return {
            accountId: account.id,
            label: account.accountLabel,
            success: true,
            recordsUpserted: result.recordsUpserted,
        };
    } catch (error) {
        const msg = (error as Error).message;
        logger.error(`✗ ${account.accountLabel}: ${msg}`);
        return {
            accountId: account.id,
            label: account.accountLabel,
            success: false,
            error: msg,
        };
    }
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

    for (let i = 0; i < accounts.length; i += COST_FETCH_CONCURRENCY) {
        const batch = accounts.slice(i, i + COST_FETCH_CONCURRENCY);
        const batchResults = await Promise.all(
            batch.map((account) => processAccount(account, startDate, endDate)),
        );
        for (let j = 0; j < batchResults.length; j++) {
            const r = batchResults[j];
            results.push(r);
            if (r.success) projectsToEvaluate.add(batch[j].projectId);
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
