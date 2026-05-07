import { Response, NextFunction } from "express";
import type { SubscriptionPlan } from "@cloudpulse/types";
import { prisma } from "../lib/prisma";
import { getRedis } from "../lib/redis";
import { AuthedRequest } from "./auth.middleware";

export type PlanLimits = {
    maxProjects: number;
    maxCloudAccounts: number;
    maxAlertRules: number;
};

const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
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
    TEAM: {
        maxProjects: 50,
        maxCloudAccounts: 100,
        maxAlertRules: 200,
    },
};

const PLAN_LIMITS_CACHE_PREFIX = "plan-limits:";
const PLAN_LIMITS_CACHE_TTL_SEC = 30;

function isKnownPlan(p: string): p is SubscriptionPlan {
    return p === "FREE" || p === "PRO" || p === "TEAM";
}

/**
 * Resolve the plan and limits for a user. FREE is the implicit default for
 * users without a Subscription row, and for any unknown plan literal so a
 * future TEAM/ENTERPRISE roll-out cannot accidentally grant unlimited.
 */
export async function getUserPlanLimits(
    userId: string,
): Promise<{ plan: SubscriptionPlan; limits: PlanLimits }> {
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    const raw = subscription?.plan ?? "FREE";
    const plan: SubscriptionPlan = isKnownPlan(raw) ? raw : "FREE";
    return { plan, limits: PLAN_LIMITS[plan] };
}

/**
 * Resolve plan + limits + current consumption in one shot. Used by the
 * /me/limits endpoint so the UI can gate create-buttons proactively
 * instead of waiting for a 403.
 *
 * Cached in Redis for 30s — the dashboard hits this on every navigation
 * and the data is low-volatility (only changes on project create/delete or
 * subscription change). Invalidate via `invalidatePlanLimitsCache(userId)`.
 *
 * Note: `cloudAccountsPerProject` and `alertRulesPerProject` are PER-PROJECT
 * caps (matching how requirePlanLimit() enforces them). Per-project usage is
 * already known to the UI from the project payload, so we don't repeat it
 * here — only the global `projects` count is returned.
 */
export async function getUserPlanLimitsAndUsage(userId: string) {
    const cacheKey = `${PLAN_LIMITS_CACHE_PREFIX}${userId}`;

    try {
        const redis = getRedis();
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch {
        // Redis unavailable — fall through to direct DB read.
    }

    const [{ plan, limits }, projects] = await Promise.all([
        getUserPlanLimits(userId),
        prisma.project.count({ where: { userId } }),
    ]);

    const payload = {
        plan,
        limits: {
            projects: limits.maxProjects,
            cloudAccountsPerProject: limits.maxCloudAccounts,
            alertRulesPerProject: limits.maxAlertRules,
        },
        usage: { projects },
    };

    try {
        const redis = getRedis();
        await redis.setex(cacheKey, PLAN_LIMITS_CACHE_TTL_SEC, JSON.stringify(payload));
    } catch {
        // Cache write failure is non-critical.
    }

    return payload;
}

/**
 * Invalidate the cached /me/limits payload for a user. Call after any
 * mutation that would shift `usage.projects` or the plan itself.
 */
export async function invalidatePlanLimitsCache(userId: string): Promise<void> {
    try {
        const redis = getRedis();
        await redis.del(`${PLAN_LIMITS_CACHE_PREFIX}${userId}`);
    } catch {
        // Non-critical — entry will expire within 30s anyway.
    }
}

/**
 * Middleware to enforce project creation limits based on subscription plan.
 */
export function requirePlanLimit(resource: "projects" | "cloudAccounts" | "alertRules") {
    return async (req: AuthedRequest, res: Response, next: NextFunction) => {
        if (req.method !== "POST") return next(); // Only enforce on creation

        const userId = req.user?.sub;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const { limits } = await getUserPlanLimits(userId);

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
