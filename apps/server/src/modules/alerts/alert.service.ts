import { prisma } from "../../lib/prisma";
import { CreateAlertRuleInput, UpdateAlertRuleInput } from "./alert.schema";

export async function createAlertRule(userId: string, input: CreateAlertRuleInput) {
    // Verify project ownership
    const project = await prisma.project.findFirst({
        where: { id: input.projectId, userId },
    });
    if (!project) throw new Error("Project not found");

    return prisma.alertRule.create({
        data: {
            projectId: input.projectId,
            dailyBudget: input.dailyBudget ?? null,
            monthlyBudget: input.monthlyBudget ?? null,
            spikeThresholdPct: input.spikeThresholdPct ?? null,
            emailEnabled: input.emailEnabled ?? true,
            slackWebhookUrl: input.slackWebhookUrl ?? null,
        },
    });
}

export async function listAlertRules(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
    });
    if (!project) throw new Error("Project not found");

    return prisma.alertRule.findMany({
        where: { projectId },
        include: {
            _count: { select: { alertsSent: true } },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function updateAlertRule(userId: string, ruleId: string, input: UpdateAlertRuleInput) {
    const rule = await prisma.alertRule.findUnique({
        where: { id: ruleId },
        include: { project: { select: { userId: true } } },
    });
    if (!rule || rule.project.userId !== userId) throw new Error("Alert rule not found");

    return prisma.alertRule.update({
        where: { id: ruleId },
        data: input,
    });
}

export async function deleteAlertRule(userId: string, ruleId: string) {
    const rule = await prisma.alertRule.findUnique({
        where: { id: ruleId },
        include: { project: { select: { userId: true } } },
    });
    if (!rule || rule.project.userId !== userId) throw new Error("Alert rule not found");

    await prisma.alertRule.delete({ where: { id: ruleId } });
    return { deleted: true };
}

export async function getAlertHistory(userId: string, projectId: string, limit = 50) {
    return prisma.alertSent.findMany({
        where: { userId, projectId },
        orderBy: { sentAt: "desc" },
        take: limit,
    });
}
