import { prisma } from "../../lib/prisma";
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
 * Get aggregated cost summary for a project
 */
export async function getProjectCostSummary(projectId: string) {
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
    const monthTotal = monthSpend._sum.amount ?? 0;
    const forecast = dayOfMonth > 0 ? (monthTotal / dayOfMonth) * daysInMonth : 0;

    return {
        todaySpend: todaySpend._sum.amount ?? 0,
        monthSpend: monthTotal,
        monthForecast: Math.round(forecast * 100) / 100,
    };
}
