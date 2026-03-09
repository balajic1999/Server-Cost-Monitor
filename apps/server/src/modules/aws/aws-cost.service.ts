import { prisma } from "../../lib/prisma";
import { getRedis } from "../../lib/redis";
import type { Redis } from "ioredis";
import { getDecryptedCredentials } from "../cloud-accounts/cloud-account.service";
import { fetchCostsByService, fetchTotalCost } from "./aws-cost.client";

/**
 * Fetch and store cost data for a single cloud account.
 * Called by the manual trigger endpoint and the scheduled job.
 */
export async function fetchAndStoreCosts(cloudAccountId: string, startDate: string, endDate: string) {
    const creds = await getDecryptedCredentials(cloudAccountId);

    if (creds.provider !== "AWS") {
        throw new Error(`Provider ${creds.provider} not yet supported`);
    }

    const dataPoints = await fetchCostsByService(creds, startDate, endDate);

    // Look up projectId once for the create clause
    const account = await prisma.cloudAccount.findUnique({
        where: { id: cloudAccountId },
        select: { projectId: true },
    });
    if (!account) throw new Error("Cloud account not found");

    // Upsert each data point into CostRecord
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
                projectId: account.projectId,
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

    // Simple linear forecast: (month_spend / days_elapsed) * days_in_month
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const monthTotal = Number(monthSpend._sum.amount ?? 0);
    const forecast = dayOfMonth > 0 ? (monthTotal / dayOfMonth) * daysInMonth : 0;

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
