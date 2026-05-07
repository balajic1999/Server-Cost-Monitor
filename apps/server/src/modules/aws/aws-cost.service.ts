import { prisma } from "../../lib/prisma";
import { getRedis } from "../../lib/redis";
import type { Redis } from "ioredis";
import { getDecryptedCredentials } from "../cloud-accounts/cloud-account.service";
import { fetchCostsByService, fetchTotalCost, type CostDataPoint } from "./aws-cost.client";
import { fetchGcpCostsByService } from "../gcp/gcp-cost.client";
import { fetchAzureCostsByService } from "../azure/azure-cost.client";

/**
 * Fetch and store cost data for a single cloud account.
 * Routes to the appropriate cloud provider SDK based on the account's provider.
 * Called by the manual trigger endpoint and the scheduled job.
 */
export async function fetchAndStoreCosts(cloudAccountId: string, startDate: string, endDate: string) {
    const creds = await getDecryptedCredentials(cloudAccountId);

    let dataPoints: CostDataPoint[];

    switch (creds.provider) {
        case "AWS":
            dataPoints = await fetchCostsByService(creds, startDate, endDate);
            break;
        case "GCP":
            if (!creds.gcpKeyJson) throw new Error("GCP service account key is missing");
            dataPoints = await fetchGcpCostsByService(
                { gcpKeyJson: creds.gcpKeyJson, externalAccountId: creds.externalAccountId },
                startDate,
                endDate
            );
            break;
        case "AZURE":
            if (!creds.azureTenantId || !creds.azureClientId || !creds.azureClientSecret || !creds.azureSubscriptionId) {
                throw new Error("Azure credentials are incomplete");
            }
            dataPoints = await fetchAzureCostsByService(
                {
                    azureTenantId: creds.azureTenantId,
                    azureClientId: creds.azureClientId,
                    azureClientSecret: creds.azureClientSecret,
                    azureSubscriptionId: creds.azureSubscriptionId,
                    externalAccountId: creds.externalAccountId,
                },
                startDate,
                endDate
            );
            break;
        default:
            throw new Error(`Provider ${creds.provider} is not supported`);
    }

    // projectId already loaded by getDecryptedCredentials — no extra roundtrip.
    const upserts = dataPoints.map((dp) =>
        prisma.costRecord.upsert({
            where: {
                cloudAccountId_serviceName_periodStart_periodEnd: {
                    cloudAccountId,
                    serviceName: dp.serviceName,
                    periodStart: new Date(dp.periodStart),
                    periodEnd: new Date(dp.periodEnd),
                },
            },
            update: {
                amount: dp.amount,
                currency: dp.currency,
            },
            create: {
                cloudAccountId,
                projectId: creds.projectId,
                serviceName: dp.serviceName,
                amount: dp.amount,
                currency: dp.currency,
                periodStart: new Date(dp.periodStart),
                periodEnd: new Date(dp.periodEnd),
                granularity: "DAILY",
            },
        })
    );

    const results = await prisma.$transaction(upserts);
    return { recordsUpserted: results.length, startDate, endDate };
}

/**
 * Fetch cost records from the database for display.
 */
export async function getCostRecords(
    cloudAccountId: string,
    startDate?: string,
    endDate?: string
) {
    const where: any = { cloudAccountId };

    if (startDate) {
        where.periodStart = { gte: new Date(startDate) };
    }
    if (endDate) {
        where.periodEnd = { ...(where.periodEnd || {}), lte: new Date(endDate) };
    }

    return prisma.costRecord.findMany({
        where,
        orderBy: { periodStart: "desc" },
        take: 500,
    });
}

/**
 * Get aggregated cost summary for a project.
 * Results are cached in Redis for 5 minutes to avoid redundant DB queries.
 */
export async function getProjectCostSummary(projectId: string) {
    // Try Redis cache first
    let redis: Redis | null = null;
    const cacheKey = `cost-summary:${projectId}`;

    try {
        redis = getRedis();
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch {
        // Redis unavailable — fall through to DB
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const monthStart = `${todayStr.slice(0, 7)}-01`;

    const [todaySpend, monthSpend] = await Promise.all([
        prisma.costRecord.aggregate({
            where: {
                cloudAccount: { projectId },
                periodStart: { gte: new Date(todayStr) },
            },
            _sum: { amount: true },
        }),
        prisma.costRecord.aggregate({
            where: {
                cloudAccount: { projectId },
                periodStart: { gte: new Date(monthStart) },
            },
            _sum: { amount: true },
        }),
    ]);

    // Linear forecast based on COMPLETED days only. Cloud cost APIs lag
    // 24–48h, so today's row is partial and would skew the daily rate
    // downward if included. On the 1st of the month there are no completed
    // days yet — return month-to-date as a placeholder rather than a wild
    // multiplier off a partial day.
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const completedDays = dayOfMonth - 1;
    const monthTotal = Number(monthSpend._sum.amount ?? 0);
    const forecast = completedDays > 0
        ? (monthTotal / completedDays) * daysInMonth
        : monthTotal;

    const summary = {
        todaySpend: Number(todaySpend._sum.amount ?? 0),
        monthSpend: monthTotal,
        monthForecast: Math.round(forecast * 100) / 100,
    };

    // Cache for 5 minutes
    try {
        if (redis) {
            await redis.setex(cacheKey, 300, JSON.stringify(summary));
        }
    } catch {
        // Cache write failure is non-critical
    }

    return summary;
}

/**
 * Invalidate cached cost summary for a project.
 * Called after new cost data is fetched.
 */
export async function invalidateCostSummaryCache(projectId: string): Promise<void> {
    try {
        const redis = getRedis();
        await redis.del(`cost-summary:${projectId}`);
    } catch {
        // Non-critical
    }
}
