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

    // Encrypt credentials if provided
    const accessKeyEncrypted = input.accessKey
        ? encrypt(input.accessKey, env.ENCRYPTION_KEY)
        : null;
    const secretKeyEncrypted = input.secretKey
        ? encrypt(input.secretKey, env.ENCRYPTION_KEY)
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
 * Retrieve decrypted credentials for a cloud account (internal use only).
 */
export async function getDecryptedCredentials(accountId: string) {
    const account = await prisma.cloudAccount.findUnique({
        where: { id: accountId },
    });
    if (!account) throw new Error("Cloud account not found");

    return {
        provider: account.provider,
        roleArn: account.roleArn,
        accessKey: account.accessKeyEncrypted
            ? decrypt(account.accessKeyEncrypted, env.ENCRYPTION_KEY)
            : null,
        secretKey: account.secretKeyEncrypted
            ? decrypt(account.secretKeyEncrypted, env.ENCRYPTION_KEY)
            : null,
        externalAccountId: account.externalAccountId,
    };
}
