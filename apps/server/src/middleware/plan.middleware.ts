import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "./auth.middleware";

export type PlanLimits = {
    maxProjects: number;
    maxCloudAccounts: number;
    maxAlertRules: number;
};

const PLAN_LIMITS: Record<string, PlanLimits> = {
    FREE: {
        maxProjects: 1,
        maxCloudAccounts: 1,
        maxAlertRules: 2,
    },
    PRO: {
        maxProjects: 10,
        maxCloudAccounts: 20,
        maxAlertRules: 50,
    },
};

/**
 * Get the plan limits for a user.
 */
export async function getUserPlanLimits(userId: string): Promise<PlanLimits> {
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    const plan = subscription?.plan ?? "FREE";
    return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
}

/**
 * Middleware to enforce project creation limits based on subscription plan.
 */
export function requirePlanLimit(resource: "projects" | "cloudAccounts" | "alertRules") {
    return async (req: AuthedRequest, res: Response, next: NextFunction) => {
        if (req.method !== "POST") return next(); // Only enforce on creation

        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const limits = await getUserPlanLimits(userId);

        let currentCount = 0;

        switch (resource) {
            case "projects":
                currentCount = await prisma.project.count({ where: { userId } });
                if (currentCount >= limits.maxProjects) {
                    return res.status(403).json({
                        message: `Free plan limited to ${limits.maxProjects} project(s). Upgrade to Pro for more.`,
                        code: "PLAN_LIMIT_REACHED",
                        limit: limits.maxProjects,
                    });
                }
                break;

            case "cloudAccounts":
                const projectId = req.body?.projectId;
                if (projectId) {
                    currentCount = await prisma.cloudAccount.count({
                        where: { projectId, project: { userId } },
                    });
                }
                if (currentCount >= limits.maxCloudAccounts) {
                    return res.status(403).json({
                        message: `Plan limited to ${limits.maxCloudAccounts} cloud account(s). Upgrade to Pro for more.`,
                        code: "PLAN_LIMIT_REACHED",
                        limit: limits.maxCloudAccounts,
                    });
                }
                break;

            case "alertRules":
                const alertProjectId = req.body?.projectId;
                if (alertProjectId) {
                    currentCount = await prisma.alertRule.count({
                        where: { projectId: alertProjectId, project: { userId } },
                    });
                }
                if (currentCount >= limits.maxAlertRules) {
                    return res.status(403).json({
                        message: `Plan limited to ${limits.maxAlertRules} alert rule(s). Upgrade to Pro for more.`,
                        code: "PLAN_LIMIT_REACHED",
                        limit: limits.maxAlertRules,
                    });
                }
                break;
        }

        next();
    };
}
