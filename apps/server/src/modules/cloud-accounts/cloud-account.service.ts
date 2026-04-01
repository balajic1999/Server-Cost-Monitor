import { prisma } from "../../lib/prisma";
import { encrypt, decrypt } from "../../lib/encryption";
import { env } from "../../config/env";
import { CreateCloudAccountInput } from "./cloud-account.schema";

export async function createCloudAccount(userId: string, input: CreateCloudAccountInput) {
    // Verify project ownership
    const project = await prisma.project.findFirst({
        where: { id: input.projectId, userId },
    });
    if (!project) throw new Error("Project not found");

    // Encrypt credentials based on provider
    const accessKeyEncrypted = input.accessKey
        ? encrypt(input.accessKey, env.ENCRYPTION_KEY)
        : null;
    const secretKeyEncrypted = input.secretKey
        ? encrypt(input.secretKey, env.ENCRYPTION_KEY)
        : null;
    const gcpKeyJsonEncrypted = input.gcpKeyJson
        ? encrypt(input.gcpKeyJson, env.ENCRYPTION_KEY)
        : null;
    const azureClientSecretEncrypted = input.azureClientSecret
        ? encrypt(input.azureClientSecret, env.ENCRYPTION_KEY)
        : null;

    return prisma.cloudAccount.create({
        data: {
            userId,
            projectId: input.projectId,
            provider: input.provider ?? "AWS",
            accountLabel: input.accountLabel,
            externalAccountId: input.externalAccountId,
            roleArn: input.roleArn ?? null,
            accessKeyEncrypted,
            secretKeyEncrypted,
            gcpKeyJsonEncrypted,
            azureTenantId: input.azureTenantId ?? null,
            azureClientId: input.azureClientId ?? null,
            azureClientSecretEncrypted,
            azureSubscriptionId: input.azureSubscriptionId ?? null,
        },
        select: {
            id: true,
            provider: true,
            accountLabel: true,
            externalAccountId: true,
            isActive: true,
            createdAt: true,
            // Never return encrypted keys
        },
    });
}

export async function listCloudAccounts(userId: string, projectId: string) {
    // Verify project ownership
    const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
    });
    if (!project) throw new Error("Project not found");

    return prisma.cloudAccount.findMany({
        where: { projectId, userId },
        select: {
            id: true,
            provider: true,
            accountLabel: true,
            externalAccountId: true,
            isActive: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function deleteCloudAccount(userId: string, accountId: string) {
    const account = await prisma.cloudAccount.findFirst({
        where: { id: accountId, userId },
    });
    if (!account) throw new Error("Cloud account not found");

    await prisma.cloudAccount.delete({ where: { id: accountId } });
    return { deleted: true };
}

/**
 * Retrieve decrypted credentials for a cloud account.
 * Returns provider-specific fields based on the account's provider.
 */
export async function getDecryptedCredentials(accountId: string, userId?: string) {
    const account = await prisma.cloudAccount.findUnique({
        where: { id: accountId },
    });
    if (!account) throw new Error("Cloud account not found");
    if (userId && account.userId !== userId) throw new Error("Not authorized");

    return {
        provider: account.provider,
        externalAccountId: account.externalAccountId,
        // AWS fields
        roleArn: account.roleArn,
        accessKey: account.accessKeyEncrypted
            ? decrypt(account.accessKeyEncrypted, env.ENCRYPTION_KEY)
            : null,
        secretKey: account.secretKeyEncrypted
            ? decrypt(account.secretKeyEncrypted, env.ENCRYPTION_KEY)
            : null,
        // GCP fields
        gcpKeyJson: account.gcpKeyJsonEncrypted
            ? decrypt(account.gcpKeyJsonEncrypted, env.ENCRYPTION_KEY)
            : null,
        // Azure fields
        azureTenantId: account.azureTenantId,
        azureClientId: account.azureClientId,
        azureClientSecret: account.azureClientSecretEncrypted
            ? decrypt(account.azureClientSecretEncrypted, env.ENCRYPTION_KEY)
            : null,
        azureSubscriptionId: account.azureSubscriptionId,
    };
}
