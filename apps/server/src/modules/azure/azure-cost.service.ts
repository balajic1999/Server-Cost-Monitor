import { prisma } from "../../lib/prisma";
import { getDecryptedCredentials } from "../cloud-accounts/cloud-account.service";
import { fetchAzureCostsByService } from "./azure-cost.client";

/**
 * Fetch and store Azure cost data for a single cloud account.
 */
export async function fetchAndStoreAzureCosts(
    cloudAccountId: string,
    startDate: string,
    endDate: string
) {
    const creds = await getDecryptedCredentials(cloudAccountId);

    if (creds.provider !== "AZURE") {
        throw new Error(`Expected AZURE provider, got ${creds.provider}`);
    }

    if (!creds.azureTenantId || !creds.azureClientId || !creds.azureClientSecret || !creds.azureSubscriptionId) {
        throw new Error("Azure credentials are incomplete");
    }

    const dataPoints = await fetchAzureCostsByService(
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

    const account = await prisma.cloudAccount.findUnique({
        where: { id: cloudAccountId },
        select: { projectId: true },
    });
    if (!account) throw new Error("Cloud account not found");

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
