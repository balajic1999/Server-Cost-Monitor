"use client";

import Link from "next/link";
import { usePlan } from "../lib/plan-cache";

type Kind = "projects" | "cloudAccounts" | "alertRules";

interface PlanLimitBannerProps {
    kind: Kind;
    currentCount: number;
}

function copyFor(kind: Kind, limit: number): string {
    const plural = limit === 1 ? "" : "s";
    switch (kind) {
        case "projects":
            return `You're using all ${limit} project slot${plural} on the Free plan.`;
        case "cloudAccounts":
            return `You've connected ${limit} cloud account${plural} to this project — the Free plan max.`;
        case "alertRules":
            return `You have ${limit} alert rule${plural} on this project — the Free plan max.`;
    }
}

export function PlanLimitBanner({ kind, currentCount }: PlanLimitBannerProps) {
    const plan = usePlan();
    if (!plan) return null;
    if (plan.plan !== "FREE") return null;

    const limit =
        kind === "projects"
            ? plan.limits.projects
            : kind === "cloudAccounts"
            ? plan.limits.cloudAccountsPerProject
            : plan.limits.alertRulesPerProject;

    if (currentCount < limit) return null;

    return (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{copyFor(kind, limit)}</p>
            <Link
                href="/dashboard/settings?tab=billing"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
                Upgrade to Pro <span aria-hidden>→</span>
            </Link>
        </div>
    );
}
