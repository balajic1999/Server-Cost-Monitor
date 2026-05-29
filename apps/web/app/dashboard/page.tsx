"use client";

import { useCallback, useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { useToast } from "../../contexts/ToastContext";
import {
    listProjects,
    createProject,
    getProjectCostSummary,
    listCloudAccounts,
    getCostRecords,
    getAlertHistory,
    listAlertRules,
    fetchCosts,
    type Project,
    type CostSummary,
    type CostRecord,
    type CloudAccount,
    type AlertSent,
    type AlertRule
} from "../../lib/api";
import {
    btnPrimary,
    btnSecondary,
    cardClass,
    headingTitleClass,
    inputClass,
    labelClass,
    metricLabelClass,
    pageDescriptionClass,
    pageHeaderClass,
    pageTitleClass
} from "../../lib/ui";
import { Sparkline } from "../../components/Sparkline";
import { EmptyState } from "../../components/EmptyState";

const SPARK_DAYS = 30;

function startDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
}

function todayIso(): string {
    return new Date().toISOString().split("T")[0];
}

function formatRelative(date: Date | null): string {
    if (!date) return "Never";
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return "just now";
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function formatMoney(n: number): string {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardPage() {
    const { addToast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [accounts, setAccounts] = useState<CloudAccount[]>([]);
    const [summaries, setSummaries] = useState<Record<string, CostSummary>>({});
    const [records, setRecords] = useState<CostRecord[]>([]);
    const [recentAlerts, setRecentAlerts] = useState<(AlertSent & { projectName: string })[]>([]);
    const [budgetRules, setBudgetRules] = useState<{ projectId: string; rule: AlertRule }[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const projs = await listProjects();
            setProjects(projs);

            const sumEntries = await Promise.all(
                projs.map(async (p) => {
                    try {
                        const s = await getProjectCostSummary(p.id);
                        return [p.id, s] as const;
                    } catch {
                        return [p.id, null] as const;
                    }
                })
            );
            const sm: Record<string, CostSummary> = {};
            for (const [id, s] of sumEntries) {
                if (s) sm[id] = s;
            }
            setSummaries(sm);

            const start = startDateDaysAgo(SPARK_DAYS);
            const allRecords: CostRecord[] = [];
            const rulesAcc: { projectId: string; rule: AlertRule }[] = [];
            const allAccounts: CloudAccount[] = [];

            for (const p of projs) {
                try {
                    const rules = await listAlertRules(p.id);
                    for (const r of rules) {
                        if (r.monthlyBudget != null && Number(r.monthlyBudget) > 0) {
                            rulesAcc.push({ projectId: p.id, rule: r });
                        }
                    }
                } catch {
                    /* skip */
                }

                try {
                    const accs = await listCloudAccounts(p.id);
                    allAccounts.push(...accs);
                    const batches = await Promise.all(
                        accs.map((a) => getCostRecords(a.id, start).catch(() => [] as CostRecord[]))
                    );
                    allRecords.push(...batches.flat());
                } catch {
                    /* skip */
                }
            }
            setRecords(allRecords);
            setBudgetRules(rulesAcc);
            setAccounts(allAccounts);

            const alertBatches = await Promise.all(
                projs.map(async (p) => {
                    try {
                        const h = await getAlertHistory(p.id);
                        return h.map((x) => ({ ...x, projectName: p.name }));
                    } catch {
                        return [];
                    }
                })
            );
            const flat = alertBatches.flat().sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
            setRecentAlerts(flat.slice(0, 4));
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const totals = useMemo(() => {
        const vals = Object.values(summaries);
        return {
            today: vals.reduce((s, v) => s + Number(v.todaySpend ?? 0), 0),
            month: vals.reduce((s, v) => s + Number(v.monthSpend ?? 0), 0),
            forecast: vals.reduce((s, v) => s + Number(v.monthForecast ?? 0), 0)
        };
    }, [summaries]);

    const totalMonthlyBudget = useMemo(() => {
        if (budgetRules.length === 0) return null;
        return budgetRules.reduce((s, r) => s + Number(r.rule.monthlyBudget ?? 0), 0);
    }, [budgetRules]);

    const lastSyncAt = useMemo(() => {
        if (records.length === 0) return null;
        const max = records.reduce((m, r) => {
            const t = new Date(r.periodStart).getTime();
            return t > m ? t : m;
        }, 0);
        return max > 0 ? new Date(max) : null;
    }, [records]);

    const sparkValues = useMemo(() => {
        const byDate: Record<string, number> = {};
        for (const r of records) {
            const d = r.periodStart.split("T")[0];
            byDate[d] = (byDate[d] ?? 0) + Number(r.amount);
        }
        const days: number[] = [];
        for (let i = SPARK_DAYS - 1; i >= 0; i--) {
            const x = new Date();
            x.setDate(x.getDate() - i);
            const key = x.toISOString().split("T")[0];
            days.push(byDate[key] ?? 0);
        }
        return days;
    }, [records]);

    const sparkHasData = sparkValues.some((v) => v > 0);

    const dailyAvg = useMemo(() => {
        const day = new Date().getDate();
        return day > 0 ? totals.month / day : 0;
    }, [totals.month]);

    const topServices = useMemo(() => {
        const bySvc: Record<string, number> = {};
        for (const r of records) {
            bySvc[r.serviceName] = (bySvc[r.serviceName] ?? 0) + Number(r.amount);
        }
        return Object.entries(bySvc)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [records]);

    const topServicesMax = topServices[0]?.[1] ?? 0;

    const totalAccounts = projects.reduce((n, p) => n + p.cloudAccounts.length, 0);

    async function handleSyncNow() {
        if (syncing || accounts.length === 0) return;
        setSyncing(true);
        const start = startDateDaysAgo(SPARK_DAYS);
        const end = todayIso();
        try {
            const results = await Promise.allSettled(accounts.map((a) => fetchCosts(a.id, start, end)));
            const failed = results.filter((r) => r.status === "rejected").length;
            if (failed === 0) {
                addToast("success", `Synced ${accounts.length} account${accounts.length !== 1 ? "s" : ""}.`);
            } else if (failed < accounts.length) {
                addToast("warning", `Synced ${accounts.length - failed} of ${accounts.length} accounts. ${failed} failed.`);
            } else {
                addToast("error", "Sync failed for all accounts.");
            }
            await load();
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setSyncing(false);
        }
    }

    async function handleCreateProject(e: FormEvent) {
        e.preventDefault();
        const name = newProjectName.trim();
        if (name.length < 2) {
            addToast("warning", "Enter a project name (2+ characters).");
            return;
        }
        setCreating(true);
        try {
            const p = await createProject({ name, timezone: "UTC" });
            setProjects((prev) => [p, ...prev]);
            setNewProjectName("");
            addToast("success", "Project created.");
            await load();
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setCreating(false);
        }
    }

    if (loading) return <DashboardSkeleton />;

    if (loadError) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className={pageTitleClass}>Dashboard</h1>
                </div>
                <div className={cardClass}>
                    <p className="text-sm font-medium text-foreground">Couldn&rsquo;t load your dashboard</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Something went wrong fetching your projects and costs. Check your connection and try again.
                    </p>
                    <button type="button" onClick={() => load()} className={`${btnPrimary} mt-4`}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className={pageTitleClass}>Dashboard</h1>
                    <p className={pageDescriptionClass}>Create a project, then connect your clouds.</p>
                </div>
                <div className={cardClass}>
                    <h2 className={headingTitleClass}>New project</h2>
                    <p className="mt-1 text-sm text-muted-foreground">One project is enough to start. You can add more later.</p>
                    <form onSubmit={handleCreateProject} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <label htmlFor="np" className={labelClass}>
                                Name
                            </label>
                            <input
                                id="np"
                                className={inputClass}
                                placeholder="e.g. Production"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                            />
                        </div>
                        <button type="submit" disabled={creating} className={btnPrimary}>
                            {creating ? "Creating…" : "Create project"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className={pageHeaderClass}>
                <div>
                    <h1 className={pageTitleClass}>Dashboard</h1>
                    <p className={pageDescriptionClass}>
                        {projects.length} project{projects.length !== 1 ? "s" : ""} · {totalAccounts} connection
                        {totalAccounts !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleSyncNow}
                        disabled={syncing || accounts.length === 0}
                        className={btnSecondary}
                        title={accounts.length === 0 ? "Connect a cloud account first" : "Fetch latest costs for all accounts"}
                    >
                        {syncing ? "Syncing…" : "Sync now"}
                    </button>
                    <Link href="/dashboard/projects" className={btnPrimary}>
                        Projects
                    </Link>
                </div>
            </div>

            <section className={cardClass}>
                <p className={metricLabelClass}>Spend this month</p>
                {sparkHasData ? (
                    <>
                        <p className="mt-3 font-serif text-4xl font-medium leading-none tabular-nums text-foreground">
                            ${formatMoney(totals.month)}
                        </p>
                        <div className="mt-6 h-20 text-accent">
                            <Sparkline values={sparkValues} title={`Daily spend over the last ${SPARK_DAYS} days`} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>
                                Forecast{" "}
                                <span className="font-medium tabular-nums text-foreground">${formatMoney(totals.forecast)}</span>
                            </span>
                            <span aria-hidden>·</span>
                            <span>
                                Daily avg{" "}
                                <span className="font-medium tabular-nums text-foreground">${formatMoney(dailyAvg)}</span>
                            </span>
                            <span aria-hidden>·</span>
                            <span>
                                {totalAccounts} account{totalAccounts !== 1 ? "s" : ""}
                            </span>
                            <span aria-hidden>·</span>
                            <span>
                                {totalMonthlyBudget
                                    ? `Budget $${formatMoney(totalMonthlyBudget)}`
                                    : "No budget set"}
                            </span>
                            <span aria-hidden>·</span>
                            <span>Last sync {formatRelative(lastSyncAt)}</span>
                        </div>
                    </>
                ) : (
                    <EmptyState
                        message={
                            accounts.length === 0
                                ? "No spend recorded yet."
                                : "No spend recorded yet. Run a sync to fetch the last 30 days."
                        }
                        actionLabel={accounts.length === 0 ? "Connect a cloud account to start tracking" : "Sync now"}
                        actionHref={accounts.length === 0 ? "/dashboard/connect" : undefined}
                        onAction={accounts.length === 0 ? undefined : handleSyncNow}
                    />
                )}
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className={cardClass}>
                    <div className="flex items-center justify-between gap-2">
                        <h2 className={headingTitleClass}>By service</h2>
                        <span className="text-xs text-muted-foreground">Last {SPARK_DAYS} days</span>
                    </div>
                    {topServices.length === 0 ? (
                        <EmptyState message="No service data yet." />
                    ) : (
                        <ul className="mt-5 space-y-3">
                            {topServices.map(([name, amt]) => {
                                const pct = topServicesMax > 0 ? (amt / topServicesMax) * 100 : 0;
                                return (
                                    <li key={name} className="text-sm">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="truncate text-foreground">{name}</span>
                                            <span className="shrink-0 tabular-nums font-medium text-foreground">
                                                ${formatMoney(amt)}
                                            </span>
                                        </div>
                                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-accent"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <section className={cardClass}>
                    <div className="flex items-center justify-between gap-2">
                        <h2 className={headingTitleClass}>Recent alerts</h2>
                        <Link href="/dashboard/alerts" className="text-xs font-medium text-accent hover:underline">
                            View all
                        </Link>
                    </div>
                    {recentAlerts.length === 0 ? (
                        <EmptyState
                            message="No alerts yet. Set a monthly budget on a project and we'll notify you when you're approaching it."
                            actionLabel="Set up a budget alert"
                            actionHref="/dashboard/projects"
                        />
                    ) : (
                        <ul className="mt-5 space-y-4">
                            {recentAlerts.map((a) => (
                                <li key={a.id} className="text-sm">
                                    <p className="font-medium text-foreground">{a.reason}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {a.projectName} · {a.channel} · {formatRelative(new Date(a.sentAt))}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}

function SkelLine({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded bg-muted-strong/60 ${className}`} />;
}

function DashboardSkeleton() {
    return (
        <div className="space-y-8">
            <div className={pageHeaderClass}>
                <div className="space-y-2">
                    <SkelLine className="h-7 w-40" />
                    <SkelLine className="h-4 w-56" />
                </div>
                <SkelLine className="h-9 w-28" />
            </div>
            <div className={cardClass}>
                <SkelLine className="h-3 w-28" />
                <SkelLine className="mt-4 h-10 w-44" />
                <SkelLine className="mt-6 h-20 w-full" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <div className={cardClass}>
                    <SkelLine className="h-4 w-24" />
                    <SkelLine className="mt-5 h-3 w-full" />
                    <SkelLine className="mt-4 h-3 w-full" />
                </div>
                <div className={cardClass}>
                    <SkelLine className="h-4 w-24" />
                    <SkelLine className="mt-5 h-3 w-full" />
                </div>
            </div>
        </div>
    );
}
