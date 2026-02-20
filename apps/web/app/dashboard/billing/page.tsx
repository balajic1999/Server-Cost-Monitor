"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import {
    getSubscription,
    createCheckoutSession,
    createPortalSession,
    Subscription,
} from "../../../lib/api";

const PLANS = [
    {
        name: "Free",
        key: "FREE" as const,
        price: "$0",
        period: "forever",
        features: [
            "1 project",
            "1 cloud account",
            "2 alert rules",
            "Daily cost sync (6h interval)",
            "7-day data retention",
        ],
        cta: "Current Plan",
    },
    {
        name: "Pro",
        key: "PRO" as const,
        price: "$29",
        period: "/month",
        features: [
            "10 projects",
            "20 cloud accounts",
            "50 alert rules",
            "Hourly cost sync",
            "Unlimited data retention",
            "Priority support",
            "Slack notifications",
        ],
        cta: "Upgrade to Pro",
        highlight: true,
    },
];

export default function BillingPage() {
    const { token } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!token) return;
        getSubscription(token)
            .then(setSubscription)
            .catch(() => setSubscription({ plan: "FREE", status: "ACTIVE", currentPeriodEnd: null, hasStripeSubscription: false }))
            .finally(() => setLoading(false));
    }, [token]);

    const handleUpgrade = async () => {
        if (!token) return;
        setActionLoading(true);
        try {
            const { url } = await createCheckoutSession(token);
            if (url) window.location.href = url;
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleManage = async () => {
        if (!token) return;
        setActionLoading(true);
        try {
            const { url } = await createPortalSession(token);
            if (url) window.location.href = url;
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    const currentPlan = subscription?.plan ?? "FREE";
    const isActive = subscription?.status === "ACTIVE";

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Billing</h1>
                <p className="text-slate-400">
                    Manage your subscription and billing details
                </p>
            </div>

            {/* Status Banner */}
            {subscription?.status === "PAST_DUE" && (
                <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-amber-300">Payment past due</p>
                            <p className="text-xs text-amber-400/70">Please update your payment method to continue using Pro features.</p>
                        </div>
                        <button onClick={handleManage} className="ml-auto text-sm font-medium text-amber-300 hover:text-amber-200 transition">
                            Update payment →
                        </button>
                    </div>
                </div>
            )}

            {/* Plans Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {PLANS.map((plan) => {
                    const isCurrent = currentPlan === plan.key;
                    return (
                        <div
                            key={plan.key}
                            className={`relative rounded-2xl border p-6 transition-all ${plan.highlight
                                    ? "border-indigo-500/50 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 shadow-xl shadow-indigo-500/10"
                                    : "border-slate-700/50 bg-slate-800/30"
                                }`}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-3 right-6">
                                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30">
                                        Recommended
                                    </span>
                                </div>
                            )}

                            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>

                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-white">{plan.price}</span>
                                <span className="text-slate-400">{plan.period}</span>
                            </div>

                            <ul className="mt-6 space-y-3">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                                        <svg className="h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-8">
                                {isCurrent && isActive ? (
                                    <div className="flex flex-col gap-2">
                                        <span className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-sm font-medium text-emerald-400">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Current Plan
                                        </span>
                                        {subscription?.hasStripeSubscription && (
                                            <button
                                                onClick={handleManage}
                                                disabled={actionLoading}
                                                className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
                                            >
                                                Manage Subscription
                                            </button>
                                        )}
                                    </div>
                                ) : plan.key === "PRO" ? (
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={actionLoading}
                                        className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-400 hover:to-violet-400 disabled:opacity-50"
                                    >
                                        {actionLoading ? "Redirecting..." : plan.cta}
                                    </button>
                                ) : (
                                    <span className="flex items-center justify-center rounded-xl border border-slate-600/50 px-4 py-2.5 text-sm text-slate-500">
                                        {plan.cta}
                                    </span>
                                )}
                            </div>

                            {isCurrent && subscription?.currentPeriodEnd && (
                                <p className="mt-4 text-center text-xs text-slate-500">
                                    {subscription.status === "CANCELLED"
                                        ? `Access until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                                        : `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* FAQ */}
            <div className="mt-12 rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h3>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-medium text-slate-300">Can I cancel anytime?</p>
                        <p className="text-sm text-slate-400 mt-1">Yes, you can cancel your Pro subscription at any time. You&apos;ll continue to have access until the end of your billing period.</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-300">What happens to my data if I downgrade?</p>
                        <p className="text-sm text-slate-400 mt-1">Your data is preserved. You&apos;ll be limited to the Free plan limits, but existing data remains accessible.</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-300">Do you offer refunds?</p>
                        <p className="text-sm text-slate-400 mt-1">We offer a 14-day money-back guarantee. Contact support within 14 days of your purchase for a full refund.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
