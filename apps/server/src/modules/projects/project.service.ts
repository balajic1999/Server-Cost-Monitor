import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/app-error";
import { invalidatePlanLimitsCache } from "../../middleware/plan.middleware";
import { CreateProjectInput, UpdateProjectInput } from "./project.schema";

export async function createProject(userId: string, input: CreateProjectInput) {
    // Plan-limit enforcement lives in requirePlanLimit("projects") middleware.
    // Service only enforces uniqueness and validates input shape.

    const nameTaken = await prisma.project.findFirst({
        where: { userId, name: input.name },
        select: { id: true },
    });
    if (nameTaken) {
        throw new AppError(
            409,
            "A project with this name already exists. Please choose a different name."
        );
    }

    const project = await prisma.project.create({
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

    // usage.projects bumped — drop the /me/limits cache so the UI sees the
    // new count on its next fetch instead of waiting up to 30s.
    await invalidatePlanLimitsCache(userId);

    return project;
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
    await invalidatePlanLimitsCache(userId);
    return { deleted: true };
}
