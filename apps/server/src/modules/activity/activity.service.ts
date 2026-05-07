import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";

export type ActivityAction =
    | "PROJECT_CREATED"
    | "PROJECT_DELETED"
    | "ACCOUNT_ADDED"
    | "ACCOUNT_DELETED"
    | "COST_FETCHED"
    | "ALERT_TRIGGERED"
    | "ALERT_CREATED"
    | "ALERT_DELETED"
    | "PROFILE_UPDATED"
    | "PASSWORD_CHANGED"
    | "LOGIN";

export async function logActivity(
    userId: string,
    action: ActivityAction,
    details?: Record<string, any>
) {
    try {
        await prisma.activityLog.create({
            data: {
                userId,
                action,
                details: details ?? {},
            },
        });
    } catch (err) {
        // Don't let activity logging break main flows
        logger.error(`[Activity] Log failed: ${(err as Error).message}`);
    }
}

export async function getActivity(userId: string, limit = 50) {
    return prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
    });
}
