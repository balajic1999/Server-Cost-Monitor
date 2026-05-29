"use client";

import { useEffect, useState } from "react";
import { getMyLimits, type PlanLimitsAndUsage } from "./api";

let cached: PlanLimitsAndUsage | null = null;
let cachedAt = 0;
let inflight: Promise<PlanLimitsAndUsage> | null = null;
const TTL_MS = 60_000;
const listeners = new Set<(v: PlanLimitsAndUsage | null) => void>();

async function load(force = false): Promise<PlanLimitsAndUsage | null> {
    if (!force && cached && Date.now() - cachedAt < TTL_MS) return cached;
    if (inflight) return inflight;
    inflight = getMyLimits()
        .then((v) => {
            cached = v;
            cachedAt = Date.now();
            inflight = null;
            for (const fn of listeners) fn(v);
            return v;
        })
        .catch((err) => {
            inflight = null;
            throw err;
        });
    try {
        return await inflight;
    } catch {
        return null;
    }
}

/** Invalidate the cache (call after a mutation that changes usage). */
export function refreshPlan() {
    cached = null;
    cachedAt = 0;
    return load(true);
}

/** Hook: returns null while loading; re-renders all consumers on refresh. */
export function usePlan(): PlanLimitsAndUsage | null {
    const [state, setState] = useState<PlanLimitsAndUsage | null>(cached);

    useEffect(() => {
        listeners.add(setState);
        load().then((v) => setState(v));
        return () => {
            listeners.delete(setState);
        };
    }, []);

    return state;
}
