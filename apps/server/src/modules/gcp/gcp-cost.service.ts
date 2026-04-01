import { prisma } from "../../lib/prisma";
import { getDecryptedCredentials } from "../cloud-accounts/cloud-account.service";
import { fetchGcpCostsByService } from "./gcp-cost.client";

/**
 * Fetch and store GCP cost data for a single cloud account.
 */
export async function fetchAndStoreGcpCosts(
    cloudAccountId: string,
    startDate: string,
    endDate: string
) {
    const creds = await getDecryptedCredentials(cloudAccountId);

    if (creds.provider !== "GCP") {
        throw new Error(`Expected GCP provider, got ${creds.provider}`);
    }

    if (!creds.gcpKeyJson) {
        throw new Error("GCP service account key is missing");
    }

    const dataPoints = await fetchGcpCostsByService(
        {
            gcpKeyJson: creds.gcpKeyJson,
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
