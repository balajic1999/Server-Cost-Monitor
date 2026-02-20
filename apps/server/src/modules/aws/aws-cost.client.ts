import {
    CostExplorerClient,
    GetCostAndUsageCommand,
    GetCostAndUsageCommandInput,
    Granularity,
} from "@aws-sdk/client-cost-explorer";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

export interface AwsCredentials {
    accessKey: string | null;
    secretKey: string | null;
    roleArn: string | null;
    externalAccountId: string;
}

export interface CostDataPoint {
    serviceName: string;
    amount: number;
    currency: string;
    periodStart: string;
    periodEnd: string;
}

/**
 * Build an authenticated CostExplorerClient, supporting either
 * direct access keys or IAM role assumption.
 */
async function buildCostExplorerClient(creds: AwsCredentials): Promise<CostExplorerClient> {
    // If using IAM Role, assume it first
    if (creds.roleArn) {
        const stsClient = new STSClient({
            region: "us-east-1",
            ...(creds.accessKey && creds.secretKey
                ? {
                    credentials: {
                        accessKeyId: creds.accessKey,
                        secretAccessKey: creds.secretKey,
                    },
                }
                : {}),
        });

        const assumed = await stsClient.send(
            new AssumeRoleCommand({
                RoleArn: creds.roleArn,
                RoleSessionName: `cloudpulse-${Date.now()}`,
                DurationSeconds: 900,
            })
        );

        if (!assumed.Credentials) {
            throw new Error("Failed to assume IAM role");
        }

        return new CostExplorerClient({
            region: "us-east-1",
            credentials: {
                accessKeyId: assumed.Credentials.AccessKeyId!,
                secretAccessKey: assumed.Credentials.SecretAccessKey!,
                sessionToken: assumed.Credentials.SessionToken!,
            },
        });
    }

    // Direct access keys
    if (!creds.accessKey || !creds.secretKey) {
        throw new Error("No valid AWS credentials provided");
    }

    return new CostExplorerClient({
        region: "us-east-1",
        credentials: {
            accessKeyId: creds.accessKey,
            secretAccessKey: creds.secretKey,
        },
    });
}

/**
 * Fetch cost breakdown by service for a given date range.
 * AWS Cost Explorer returns data daily at minimum.
 */
export async function fetchCostsByService(
    creds: AwsCredentials,
    startDate: string, // YYYY-MM-DD
    endDate: string     // YYYY-MM-DD
): Promise<CostDataPoint[]> {
    const client = await buildCostExplorerClient(creds);

    const params: GetCostAndUsageCommandInput = {
        TimePeriod: { Start: startDate, End: endDate },
        Granularity: Granularity.DAILY,
        Metrics: ["UnblendedCost"],
        GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
    };

    const response = await client.send(new GetCostAndUsageCommand(params));

    const dataPoints: CostDataPoint[] = [];

    for (const result of response.ResultsByTime ?? []) {
        const periodStart = result.TimePeriod?.Start ?? startDate;
        const periodEnd = result.TimePeriod?.End ?? endDate;

        for (const group of result.Groups ?? []) {
            const serviceName = group.Keys?.[0] ?? "Unknown";
            const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? "0");
            const currency = group.Metrics?.UnblendedCost?.Unit ?? "USD";

            if (amount > 0) {
                dataPoints.push({ serviceName, amount, currency, periodStart, periodEnd });
            }
        }
    }

    return dataPoints;
}

/**
 * Fetch total cost for a date range (no service breakdown).
 */
export async function fetchTotalCost(
    creds: AwsCredentials,
    startDate: string,
    endDate: string
): Promise<{ amount: number; currency: string }> {
    const client = await buildCostExplorerClient(creds);

    const params: GetCostAndUsageCommandInput = {
        TimePeriod: { Start: startDate, End: endDate },
        Granularity: Granularity.DAILY,
        Metrics: ["UnblendedCost"],
    };

    const response = await client.send(new GetCostAndUsageCommand(params));

    let total = 0;
    let currency = "USD";

    for (const result of response.ResultsByTime ?? []) {
        total += parseFloat(result.Total?.UnblendedCost?.Amount ?? "0");
        currency = result.Total?.UnblendedCost?.Unit ?? "USD";
    }

    return { amount: total, currency };
}
