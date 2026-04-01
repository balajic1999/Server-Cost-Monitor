import { z } from "zod";

export const createCloudAccountSchema = z.object({
    projectId: z.string().min(1),
    provider: z.enum(["AWS", "GCP", "AZURE"]).default("AWS"),
    accountLabel: z.string().min(2).max(100),
    externalAccountId: z.string().min(1, "Account/Project/Subscription ID is required"),
    // AWS credentials
    roleArn: z.string().optional(),
    accessKey: z.string().optional(),
    secretKey: z.string().optional(),
    // GCP credentials
    gcpKeyJson: z.string().optional(),
    // Azure credentials
    azureTenantId: z.string().optional(),
    azureClientId: z.string().optional(),
    azureClientSecret: z.string().optional(),
    azureSubscriptionId: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.provider === "AWS") {
        if (!data.roleArn && !(data.accessKey && data.secretKey)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "AWS requires either roleArn or accessKey+secretKey",
            });
        }
    } else if (data.provider === "GCP") {
        if (!data.gcpKeyJson) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "GCP requires a Service Account JSON key",
            });
        }
    } else if (data.provider === "AZURE") {
        if (!data.azureTenantId || !data.azureClientId || !data.azureClientSecret || !data.azureSubscriptionId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Azure requires tenantId, clientId, clientSecret, and subscriptionId",
            });
        }
    }
});

export type CreateCloudAccountInput = z.infer<typeof createCloudAccountSchema>;
