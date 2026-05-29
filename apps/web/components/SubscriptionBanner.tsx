"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createPortalSession, getSubscription, type Subscription } from "../lib/api";
import { useToast } from "../contexts/ToastContext";

let cached: Subscription | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

async function loadSubscription(): Promise<Subscription | null> {
    if (cached && Date.now() - cachedAt < TTL_MS) return cached;
    try {
        const s = await getSubscription();
        cached = s;
        cachedAt = Date.now();
        return s;
    } catch {
        return null;
    }
}

function dismissKey(status: string) {
    return `cp:subBanner:${status}`;
}

export function SubscriptionBanner() {
    const pathname = usePathname();
    const search = useSearchParams();
    const { addToast } = useToast();
    const [sub, setSub] = useState<Subscription | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [acting, setActing] = useState(false);

    useEffect(() => {
        let cancelled = false;
        loadSubscription().then((s) => {
            if (cancelled) return;
            setSub(s);
            if (s && typeof window !== "undefined") {
                setDismissed(sessionStorage.getItem(dismissKey(s.status)) === "1");
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    if (!sub) return null;
    if (sub.status === "ACTIVE") return null;
    if (dismissed) return null;

    // Don't show on the billing tab — user is already where they need to be.
    const onBillingTab = pathname === "/dashboard/settings" && search.get("tab") === "billing";
    if (onBillingTab) return null;

    const isPastDue = sub.status === "PAST_DUE";
    const railClass = isPastDue ? "bg-warning" : "bg-danger";
    const bgClass = isPastDue ? "bg-warning/10" : "bg-danger/10";
    const textClass = isPastDue ? "text-warning" : "text-danger";

    const message = isPastDue
        ? "Your last payment failed. Update your card to avoid losing Pro features."
        : sub.currentPeriodEnd
        ? `Your Pro subscription is cancelled. You'll keep access until ${new Date(sub.currentPeriodEnd).toLocaleDateString()}.`
        : "Your Pro subscription is cancelled.";

    const ctaLabel = isPastDue ? "Open billing portal" : "Reactivate";

    function dismiss() {
        if (!sub) return;
        sessionStorage.setItem(dismissKey(sub.status), "1");
        setDismissed(true);
    }

    async function handleCta() {
        setActing(true);
        try {
            const { url } = await createPortalSession();
            if (url) window.location.href = url;
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setActing(false);
        }
    }

    return (
        <div className={`relative flex items-start gap-3 ${bgClass} px-4 py-3 sm:px-6 lg:px-8`}>
            <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${railClass}`} />
            <div className="flex flex-1 flex-col gap-2 pl-1 sm:flex-row sm:items-center sm:justify-between">
                <p className={`text-sm font-medium ${textClass}`}>{message}</p>
                <div className="flex shrink-0 items-center gap-3">
                    <button
                        type="button"
                        onClick={handleCta}
                        disabled={acting}
                        className={`text-sm font-medium underline-offset-4 hover:underline ${textClass} disabled:opacity-50`}
                    >
                        {acting ? "Opening…" : ctaLabel}
                    </button>
                    <button
                        type="button"
                        onClick={dismiss}
                        aria-label="Dismiss"
                        className={`rounded p-1 ${textClass} opacity-70 hover:opacity-100`}
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                        >
                            <path d="M6 6l12 12M6 18L18 6" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
