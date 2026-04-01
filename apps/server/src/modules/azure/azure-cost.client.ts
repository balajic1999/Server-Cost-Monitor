import { CostManagementClient, QueryDefinition, ExportType, TimeframeType } from "@azure/arm-costmanagement";
import { ClientSecretCredential } from "@azure/identity";

export interface AzureCredentials {
    azureTenantId: string;
    azureClientId: string;
    azureClientSecret: string;
    azureSubscriptionId: string;
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
 * Build an authenticated Azure Cost Management client using Service Principal credentials.
 */
function buildCostManagementClient(creds: AzureCredentials): CostManagementClient {
    const credential = new ClientSecretCredential(
        creds.azureTenantId,
        creds.azureClientId,
        creds.azureClientSecret
    );
    return new CostManagementClient(credential);
}

/**
 * Fetch Azure cost data grouped by service for a given date range.
 * Uses the Azure Cost Management Query API.
 */
export async function fetchAzureCostsByService(
    creds: AzureCredentials,
    startDate: string, // YYYY-MM-DD
    endDate: string     // YYYY-MM-DD
): Promise<CostDataPoint[]> {
    const client = buildCostManagementClient(creds);

    const scope = `subscriptions/${creds.azureSubscriptionId}`;

    const queryDefinition: QueryDefinition = {
        type: "ActualCost" as ExportType,
        timeframe: "Custom" as TimeframeType,
        timePeriod: {
            from: new Date(startDate),
            to: new Date(endDate),
        },
        dataset: {
            granularity: "Daily" as any,
            aggregation: {
                totalCost: {
                    name: "Cost",
                    function: "Sum" as any,
                },
            },
            grouping: [
                {
                    type: "Dimension" as any,
                    name: "ServiceName",
                },
            ],
        },
    };

    const result = await client.query.usage(scope, queryDefinition);

    const dataPoints: CostDataPoint[] = [];

    if (result.rows) {
        // Azure returns rows as arrays: [cost, date, serviceName, currency]
        // Column order depends on the query definition
        const columns = result.columns?.map((c) => c.name) ?? [];
        const costIdx = columns.indexOf("Cost");
        const dateIdx = columns.indexOf("UsageDate");
        const serviceIdx = columns.indexOf("ServiceName");
        const currencyIdx = columns.indexOf("Currency");

        for (const row of result.rows) {
            const amount = parseFloat(String(row[costIdx >= 0 ? costIdx : 0]));
            const dateRaw = String(row[dateIdx >= 0 ? dateIdx : 1]);
            const serviceName = String(row[serviceIdx >= 0 ? serviceIdx : 2]) || "Unknown";
            const currency = String(row[currencyIdx >= 0 ? currencyIdx : 3]) || "USD";

            if (amount <= 0) continue;

            // Azure date format may be YYYYMMDD or similar
            const dateStr = dateRaw.length === 8
                ? `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`
                : dateRaw;

            const nextDate = new Date(dateStr);
            nextDate.setDate(nextDate.getDate() + 1);

            dataPoints.push({
                serviceName,
                amount,
                currency,
                periodStart: dateStr,
                periodEnd: nextDate.toISOString().split("T")[0],
            });
        }
    }

    return dataPoints;
}

/**
 * Fetch total Azure cost for a date range (no service breakdown).
 */
export async function fetchAzureTotalCost(
    creds: AzureCredentials,
    startDate: string,
    endDate: string
): Promise<{ amount: number; currency: string }> {
    const dataPoints = await fetchAzureCostsByService(creds, startDate, endDate);
    const total = dataPoints.reduce((sum, dp) => sum + dp.amount, 0);
    return { amount: total, currency: dataPoints[0]?.currency ?? "USD" };
}
