import { prisma } from "../../lib/prisma";
import { CreateProjectInput, UpdateProjectInput } from "./project.schema";

const FREE_PROJECT_LIMIT = 1;

export async function createProject(userId: string, input: CreateProjectInput) {
    // Check subscription plan limits
    const subscription = await prisma.subscription.findUnique({
        where: { userId },
    });

    const plan = subscription?.plan ?? "FREE";

    if (plan === "FREE") {
        const count = await prisma.project.count({ where: { userId } });
        if (count >= FREE_PROJECT_LIMIT) {
            throw new Error("Free plan allows only 1 project. Upgrade to Pro for unlimited projects.");
        }
    }

    return prisma.project.create({
        data: {
            userId,
            name: input.name,
            timezone: input.timezone ?? "UTC",
        },
        include: {
            cloudAccounts: true,
            _count: { select: { costRecords: true, alertRules: true } },
        },
    });
}

export async function listProjects(userId: string) {
    return prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
            cloudAccounts: {
                select: {
                    id: true,
                    provider: true,
                    accountLabel: true,
                    isActive: true,
                },
            },
            _count: { select: { costRecords: true, alertRules: true } },
        },
    });
}

export async function getProject(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
        include: {
            cloudAccounts: {
                select: {
                    id: true,
                    provider: true,
                    accountLabel: true,
                    externalAccountId: true,
                    isActive: true,
                    createdAt: true,
                },
            },
            alertRules: true,
            _count: { select: { costRecords: true } },
        },
    });

    if (!project) {
        throw new Error("Project not found");
    }

    return project;
}

export async function updateProject(
    userId: string,
    projectId: string,
    input: UpdateProjectInput
) {
    // Verify ownership
    const existing = await prisma.project.findFirst({
        where: { id: projectId, userId },
    });

    if (!existing) {
        throw new Error("Project not found");
    }

    return prisma.project.update({
        where: { id: projectId },
        data: input,
        include: {
            cloudAccounts: {
                select: {
                    id: true,
                    provider: true,
                    accountLabel: true,
                    isActive: true,
                },
            },
            _count: { select: { costRecords: true, alertRules: true } },
        },
    });
}

export async function deleteProject(userId: string, projectId: string) {
    const existing = await prisma.project.findFirst({
        where: { id: projectId, userId },
    });

    if (!existing) {
        throw new Error("Project not found");
    }

    await prisma.project.delete({ where: { id: projectId } });
    return { deleted: true };
}
