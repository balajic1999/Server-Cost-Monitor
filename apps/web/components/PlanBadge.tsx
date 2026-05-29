"use client";

import Link from "next/link";
import { usePlan } from "../lib/plan-cache";

export function PlanBadge() {
    const plan = usePlan();
    if (!plan) return null;

    const base = "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide";

    if (plan.plan === "FREE") {
        return (
            <Link
                href="/dashboard/settings?tab=billing"
                aria-label="On Free plan — upgrade to Pro"
                className={`${base} border border-border bg-muted text-muted-foreground transition hover:border-accent hover:text-accent`}
            >
                Free <span aria-hidden>→</span>
            </Link>
        );
    }

    return (
        <span className={`${base} bg-accent-soft text-accent`}>
            {plan.plan === "PRO" ? "Pro" : plan.plan}
        </span>
    );
}
