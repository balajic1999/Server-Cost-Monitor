"use client";

import { Suspense, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import {
    updateProfile,
    changePassword,
    getSubscription,
    createCheckoutSession,
    createPortalSession,
    type Subscription
} from "../../../lib/api";
import {
    btnPrimary,
    btnSecondary,
    headingTitleClass,
    inputClass,
    labelClass,
    pageDescriptionClass,
    pageTitleClass
} from "../../../lib/ui";
import { SectionCard } from "../../../components/SectionCard";

const TABS = [
    { id: "profile", label: "Profile" },
    { id: "billing", label: "Plan & Billing" },
    { id: "notifications", label: "Notifications" },
    { id: "security", label: "Security" }
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
    return (
        <Suspense fallback={null}>
            <SettingsContent />
        </Suspense>
    );
}

function SettingsContent() {
    const router = useRouter();
    const search = useSearchParams();
    const tabParam = search.get("tab");
    const active: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : "profile";

    function setTab(id: TabId) {
        const next = new URLSearchParams(search.toString());
        next.set("tab", id);
        router.replace(`/dashboard/settings?${next.toString()}`, { scroll: false });
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className={pageTitleClass}>Settings</h1>
                <p className={pageDescriptionClass}>Account, plan, notifications, and security.</p>
            </div>

            <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-1 border-b border-border">
                {TABS.map((t) => {
                    const isActive = t.id === active;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`tab-${t.id}`}
                            onClick={() => setTab(t.id)}
                            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                                isActive
                                    ? "border-accent text-foreground"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>

            <div id={`tab-${active}`} role="tabpanel" className="animate-slide-up">
                {active === "profile" && <ProfileTab />}
                {active === "billing" && <BillingTab />}
                {active === "notifications" && <NotificationsTab />}
                {active === "security" && <SecurityTab />}
            </div>
        </div>
    );
}

function ProfileTab() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
        }
    }, [user]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await updateProfile({ name, email });
            addToast("success", "Profile updated.");
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <SectionCard title="Profile" description="Update your name and email.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label htmlFor="sn" className={labelClass}>
                            Name
                        </label>
                        <input
                            id="sn"
                            className={inputClass}
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="se" className={labelClass}>
                            Email
                        </label>
                        <input
                            id="se"
                            className={inputClass}
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center justify-end">
                    <button type="submit" disabled={loading} className={btnPrimary}>
                        {loading ? "Saving…" : "Save changes"}
                    </button>
                </div>
            </form>
        </SectionCard>
    );
}

function BillingTab() {
    const { addToast } = useToast();
    const [sub, setSub] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState(false);

    useEffect(() => {
        getSubscription()
            .then(setSub)
            .catch(() =>
                setSub({ plan: "FREE", status: "ACTIVE", currentPeriodEnd: null, hasStripeSubscription: false })
            )
            .finally(() => setLoading(false));
    }, []);

    async function upgrade() {
        setActing(true);
        try {
            const { url } = await createCheckoutSession();
            if (url) window.location.href = url;
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setActing(false);
        }
    }

    async function portal() {
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

    const plan = sub?.plan ?? "FREE";

    return (
        <SectionCard
            title="Plan & Billing"
            description="Manage your subscription and payment method."
            action={
                plan === "FREE" ? (
                    <button type="button" onClick={upgrade} disabled={acting || loading} className={btnPrimary}>
                        {acting ? "…" : "Upgrade to Pro"}
                    </button>
                ) : sub?.hasStripeSubscription ? (
                    <button type="button" onClick={portal} disabled={acting || loading} className={btnSecondary}>
                        Billing portal
                    </button>
                ) : null
            }
        >
            {loading ? (
                <p className="text-sm text-muted-foreground">Loading subscription…</p>
            ) : (
                <div className="space-y-6">
                    <div>
                        <p className="text-sm text-muted-foreground">You&rsquo;re on the</p>
                        <p className="mt-1 font-serif text-2xl font-medium text-foreground">{plan === "PRO" ? "Pro" : "Free"} plan</p>
                        {sub?.currentPeriodEnd ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                                Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                            </p>
                        ) : null}
                    </div>

                    <div className="border-t border-border pt-5">
                        <p className="text-sm text-foreground">
                            {plan === "PRO"
                                ? "10 projects · 20 cloud accounts · 50 alert rules"
                                : "1 project · 1 cloud account · 2 alert rules"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {plan === "PRO"
                                ? "Pro limits."
                                : "Free plan limits — upgrade for more headroom."}
                        </p>
                    </div>
                </div>
            )}
        </SectionCard>
    );
}

function NotificationsTab() {
    return (
        <div className="space-y-6">
            <SectionCard title="Budget alerts" description="Triggered when a project exceeds its monthly cap.">
                <p className="text-sm text-foreground">
                    Set a monthly budget on a project to start receiving alerts via email or Slack.
                </p>
                <Link href="/dashboard/projects" className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline">
                    Open projects <span aria-hidden>→</span>
                </Link>
            </SectionCard>

            <SectionCard title="Slack delivery" description="Per-project incoming webhook for real-time alerts.">
                <p className="text-sm text-foreground">
                    Configure a Slack webhook on each alert rule. Webhooks are stored encrypted at rest.
                </p>
                <Link href="/dashboard/alerts" className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline">
                    Open alert rules <span aria-hidden>→</span>
                </Link>
            </SectionCard>
        </div>
    );
}

function SecurityTab() {
    const { logout } = useAuth();
    const { addToast } = useToast();
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (newPw !== confirmPw) {
            addToast("error", "Passwords do not match.");
            return;
        }
        setLoading(true);
        try {
            await changePassword({ currentPassword: currentPw, newPassword: newPw });
            addToast("success", "Password updated.");
            setCurrentPw("");
            setNewPw("");
            setConfirmPw("");
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <SectionCard title="Change password" description="Use at least 8 characters.">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={labelClass}>Current password</label>
                        <input
                            className={inputClass}
                            type="password"
                            required
                            value={currentPw}
                            onChange={(e) => setCurrentPw(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelClass}>New password</label>
                            <input
                                className={inputClass}
                                type="password"
                                required
                                minLength={8}
                                value={newPw}
                                onChange={(e) => setNewPw(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Confirm new password</label>
                            <input
                                className={inputClass}
                                type="password"
                                required
                                minLength={8}
                                value={confirmPw}
                                onChange={(e) => setConfirmPw(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-end">
                        <button type="submit" disabled={loading} className={btnPrimary}>
                            {loading ? "Updating…" : "Update password"}
                        </button>
                    </div>
                </form>
            </SectionCard>

            <SectionCard title="Session" description="Signed in on this device.">
                <button type="button" onClick={() => logout()} className={btnSecondary}>
                    Sign out
                </button>
            </SectionCard>
        </div>
    );
}
