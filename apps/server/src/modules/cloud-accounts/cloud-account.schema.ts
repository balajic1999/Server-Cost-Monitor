import { z } from "zod";

export const createCloudAccountSchema = z.object({
    projectId: z.string().min(1),
    provider: z.enum(["AWS", "GCP"]).default("AWS"),
    accountLabel: z.string().min(2).max(100),
    externalAccountId: z.string().min(1, "AWS Account ID is required"),
    roleArn: z.string().optional(),
    accessKey: z.string().optional(),
    secretKey: z.string().optional(),
}).refine(
    (data) => data.roleArn || (data.accessKey && data.secretKey),
    { message: "Provide either roleArn or accessKey+secretKey" }
);

export type CreateCloudAccountInput = z.infer<typeof createCloudAccountSchema>;
