"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "../../../contexts/ToastContext";
import {
    listProjects,
    listAlertRules,
    getCompareCosts,
    fetchCosts,
    type Project,
    type AlertRule,
    type CompareRecord,
    type CompareSummary
} from "../../../lib/api";
import {
    btnPrimary,
    btnSecondary,
    cardClass,
    headingTitleClass,
    metricLabelClass,
    pageDescriptionClass,
    pageHeaderClass,
    pageTitleClass
} from "../../../lib/ui";
import { Sparkline } from "../../../components/Sparkline";
import { EmptyState } from "../../../components/EmptyState";

type RangeKey = "7d" | "30d" | "mtd" | "90d";

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number | "mtd" }[] = [
    { key: "7d", label: "7 days", days: 7 },
    { key: "30d", label: "30 days", days: 30 },
    { key: "mtd", label: "Month to date", days: "mtd" },
    { key: "90d", label: "90 days", days: 90 }
];

type SortKey =
    | "name"
    | "today"
    | "period"
    | "mtd"
    | "dailyAvg"
    | "forecast"
    | "budget"
    | "topService"
    | "lastSync";

interface ProjectRow {
    project: Project;
    summary: CompareSummary | null;
    monthlyBudget: number | null;
    periodTotal: number;
    periodDays: number;
    dailyAvg: number;
    topService: { name: string; amount: number } | null;
    spark: number[];
    lastSync: Date | null;
}

function isoDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
}

function todayIso(): string {
    return new Date().toISOString().split("T")[0];
}

function rangeBounds(range: RangeKey): { start: string; end: string; days: number } {
    const end = todayIso();
    if (range === "mtd") {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const start = first.toISOString().split("T")[0];
        const days = now.getDate();
        return { start, end, days };
    }
    const opt = RANGE_OPTIONS.find((r) => r.key === range)!;
    const days = opt.days as number;
    return { start: isoDaysAgo(days - 1), end, days };
}

function formatMoney(n: number): string {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function compactMoney(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `$${(n / 1_000).toFixed(1)}k`;
    return `$${formatMoney(n)}`;
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

function providerLabel(p: string): string {
    const v = p.toUpperCase();
    if (v === "AWS" || v === "GCP" || v === "AZURE") return v;
    return p;
}

function ProviderChip({ provider }: { provider: string }) {
    return (
        <span className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {providerLabel(provider)}
        </span>
    );
}

function BudgetCell({ spend, budget }: { spend: number; budget: number | null }) {
    if (budget == null || budget <= 0) {
        return <span className="text-xs text-subtle-foreground">—</span>;
    }
    const pct = Math.min(100, (spend / budget) * 100);
    const overage = spend > budget;
    const near = pct >= 80 && !overage;
    const barColor = overage ? "bg-danger" : near ? "bg-warning" : "bg-accent";
    const pctLabel = overage ? `${Math.round((spend / budget) * 100)}%` : `${Math.round(pct)}%`;
    return (
        <div className="min-w-[120px]">
            <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
                <span className={overage ? "font-medium text-danger" : "text-foreground"}>{pctLabel}</span>
                <span className="text-muted-foreground">${formatMoney(budget)}</span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function SortHeader({
    label,
    sortKey,
    activeKey,
    activeDir,
    onSort,
    align = "left",
    className = ""
}: {
    label: string;
    sortKey: SortKey;
    activeKey: SortKey;
    activeDir: "asc" | "desc";
    onSort: (key: SortKey) => void;
    align?: "left" | "right";
    className?: string;
}) {
    const active = sortKey === activeKey;
    const arrow = active ? (activeDir === "asc" ? "↑" : "↓") : "";
    return (
        <th
            scope="col"
            className={`whitespace-nowrap px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground ${
                align === "right" ? "text-right" : "text-left"
            } ${className}`}
        >
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={`inline-flex items-center gap-1 transition hover:text-foreground ${
                    active ? "text-foreground" : ""
                }`}
            >
                <span>{label}</span>
                <span className="text-[10px]" aria-hidden>
                    {arrow}
                </span>
            </button>
        </th>
    );
}

export default function ComparePage() {
    const { addToast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [rows, setRows] = useState<ProjectRow[]>([]);
    const [range, setRange] = useState<RangeKey>("30d");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>("period");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const load = useCallback(
        async (selected: RangeKey) => {
            setLoading(true);
            setLoadError(false);
            try {
                const projs = await listProjects();
                setProjects(projs);

                if (projs.length === 0) {
                    setRows([]);
                    return;
                }

                const bounds = rangeBounds(selected);
                const projectIds = projs.map((p) => p.id);

                const [compare, ruleBatches] = await Promise.all([
                    getCompareCosts(projectIds, bounds.days).catch(() => null),
                    Promise.all(
                        projs.map((p) =>
                            listAlertRules(p.id).catch(() => [] as AlertRule[])
                        )
                    )
                ]);

                const summaryByProject = new Map<string, CompareSummary>();
                if (compare) {
                    for (const s of compare.summaries) summaryByProject.set(s.projectId, s);
                }

                const recordsByProject = new Map<string, CompareRecord[]>();
                if (compare) {
                    for (const r of compare.records) {
                        const list = recordsByProject.get(r.projectId);
                        if (list) list.push(r);
                        else recordsByProject.set(r.projectId, [r]);
                    }
                }

                const built = projs.map((p, i) => {
                    const records = recordsByProject.get(p.id) ?? [];
                    const rules = ruleBatches[i];

                    const byDate: Record<string, number> = {};
                    const byService: Record<string, number> = {};
                    let latestTs = 0;
                    for (const r of records) {
                        const key = r.periodStart.split("T")[0];
                        const amt = Number(r.amount) || 0;
                        byDate[key] = (byDate[key] ?? 0) + amt;
                        byService[r.serviceName] = (byService[r.serviceName] ?? 0) + amt;
                        const ts = new Date(r.periodEnd).getTime();
                        if (ts > latestTs) latestTs = ts;
                    }

                    const periodTotal = Object.values(byDate).reduce((s, v) => s + v, 0);
                    const dailyAvg = bounds.days > 0 ? periodTotal / bounds.days : 0;

                    const spark: number[] = [];
                    for (let j = bounds.days - 1; j >= 0; j--) {
                        const d = new Date();
                        d.setDate(d.getDate() - j);
                        const key = d.toISOString().split("T")[0];
                        spark.push(byDate[key] ?? 0);
                    }

                    const topEntry = Object.entries(byService).sort((a, b) => b[1] - a[1])[0];
                    const topService = topEntry ? { name: topEntry[0], amount: topEntry[1] } : null;

                    const monthlyBudget = rules
                        .map((r) => Number(r.monthlyBudget ?? 0))
                        .filter((n) => n > 0)
                        .reduce((s, v) => s + v, 0);

                    const row: ProjectRow = {
                        project: p,
                        summary: summaryByProject.get(p.id) ?? null,
                        monthlyBudget: monthlyBudget > 0 ? monthlyBudget : null,
                        periodTotal,
                        periodDays: bounds.days,
                        dailyAvg,
                        topService,
                        spark,
                        lastSync: latestTs > 0 ? new Date(latestTs) : null
                    };
                    return row;
                });

                setRows(built);
            } catch {
                setLoadError(true);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        load(range);
    }, [load, range]);

    function onSort(key: SortKey) {
        if (key === sortKey) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir(key === "name" || key === "topService" ? "asc" : "desc");
        }
    }

    const sortedRows = useMemo(() => {
        const dir = sortDir === "asc" ? 1 : -1;
        const copy = [...rows];
        copy.sort((a, b) => {
            switch (sortKey) {
                case "name":
                    return a.project.name.localeCompare(b.project.name) * dir;
                case "today":
                    return ((a.summary?.todaySpend ?? 0) - (b.summary?.todaySpend ?? 0)) * dir;
                case "period":
                    return (a.periodTotal - b.periodTotal) * dir;
                case "mtd":
                    return ((a.summary?.monthSpend ?? 0) - (b.summary?.monthSpend ?? 0)) * dir;
                case "dailyAvg":
                    return (a.dailyAvg - b.dailyAvg) * dir;
                case "forecast":
                    return ((a.summary?.monthForecast ?? 0) - (b.summary?.monthForecast ?? 0)) * dir;
                case "budget": {
                    const ap = a.monthlyBudget
                        ? Number(a.summary?.monthSpend ?? 0) / a.monthlyBudget
                        : -1;
                    const bp = b.monthlyBudget
                        ? Number(b.summary?.monthSpend ?? 0) / b.monthlyBudget
                        : -1;
                    return (ap - bp) * dir;
                }
                case "topService":
                    return (a.topService?.name ?? "").localeCompare(b.topService?.name ?? "") * dir;
                case "lastSync": {
                    const at = a.lastSync?.getTime() ?? 0;
                    const bt = b.lastSync?.getTime() ?? 0;
                    return (at - bt) * dir;
                }
                default:
                    return 0;
            }
        });
        return copy;
    }, [rows, sortKey, sortDir]);

    const totals = useMemo(() => {
        return rows.reduce(
            (acc, r) => {
                acc.today += Number(r.summary?.todaySpend ?? 0);
                acc.mtd += Number(r.summary?.monthSpend ?? 0);
                acc.forecast += Number(r.summary?.monthForecast ?? 0);
                acc.period += r.periodTotal;
                acc.budget += r.monthlyBudget ?? 0;
                acc.accounts += r.project.cloudAccounts.length;
                return acc;
            },
            { today: 0, mtd: 0, forecast: 0, period: 0, budget: 0, accounts: 0 }
        );
    }, [rows]);

    const periodDays = rangeBounds(range).days;
    const totalDailyAvg = periodDays > 0 ? totals.period / periodDays : 0;
    const totalsBudgetPct = totals.budget > 0 ? Math.min(100, (totals.mtd / totals.budget) * 100) : 0;

    const allAccounts = useMemo(
        () => rows.flatMap((r) => r.project.cloudAccounts),
        [rows]
    );

    async function handleSyncAll() {
        if (syncing || allAccounts.length === 0) return;
        const bounds = rangeBounds(range);
        setSyncing(true);
        try {
            const results = await Promise.allSettled(
                allAccounts.map((a) => fetchCosts(a.id, bounds.start, bounds.end))
            );
            const failed = results.filter((r) => r.status === "rejected").length;
            if (failed === 0) {
                addToast("success", `Synced ${allAccounts.length} account${allAccounts.length !== 1 ? "s" : ""}.`);
            } else if (failed < allAccounts.length) {
                addToast(
                    "warning",
                    `Synced ${allAccounts.length - failed} of ${allAccounts.length} accounts. ${failed} failed.`
                );
            } else {
                addToast("error", "Sync failed for all accounts.");
            }
            await load(range);
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setSyncing(false);
        }
    }

    if (loading) return <CompareSkeleton />;

    if (loadError) {
        return (
            <div className="space-y-6">
                <h1 className={pageTitleClass}>Compare</h1>
                <div className={cardClass}>
                    <p className="text-sm font-medium text-foreground">Couldn&rsquo;t load the comparison</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Something went wrong fetching your projects and costs. Check your connection and try again.
                    </p>
                    <button type="button" onClick={() => load(range)} className={`${btnPrimary} mt-4`}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className={pageTitleClass}>Compare</h1>
                    <p className={pageDescriptionClass}>Side-by-side spend across every project.</p>
                </div>
                <div className={cardClass}>
                    <EmptyState
                        message="No projects to compare yet."
                        actionLabel="Create your first project"
                        actionHref="/dashboard/projects"
                    />
                </div>
            </div>
        );
    }

    if (projects.length === 1) {
        const only = rows[0];
        return (
            <div className="space-y-6">
                <div>
                    <h1 className={pageTitleClass}>Compare</h1>
                    <p className={pageDescriptionClass}>
                        Side-by-side spend across every project. Add a second project to start comparing.
                    </p>
                </div>
                <div className={cardClass}>
                    <h2 className={headingTitleClass}>{only?.project.name ?? "Your project"}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        You only have one project right now, so there&rsquo;s nothing to compare against. Create
                        another to see them side by side.
                    </p>
                    <div className="mt-4">
                        <Link href="/dashboard/projects" className={btnPrimary}>
                            Manage projects
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className={pageHeaderClass}>
                <div>
                    <h1 className={pageTitleClass}>Compare</h1>
                    <p className={pageDescriptionClass}>
                        {projects.length} projects · {totals.accounts} connection
                        {totals.accounts !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <RangeToggle value={range} onChange={setRange} />
                    <button
                        type="button"
                        onClick={handleSyncAll}
                        disabled={syncing || allAccounts.length === 0}
                        className={btnSecondary}
                        title={
                            allAccounts.length === 0
                                ? "Connect a cloud account first"
                                : "Fetch latest costs for every account"
                        }
                    >
                        {syncing ? "Syncing…" : "Sync all"}
                    </button>
                </div>
            </div>

            <section className={cardClass}>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <TotalsMetric label={`Spend · ${labelForRange(range)}`} value={`$${formatMoney(totals.period)}`}>
                        <span>
                            Daily avg{" "}
                            <span className="font-medium tabular-nums text-foreground">
                                ${formatMoney(totalDailyAvg)}
                            </span>
                        </span>
                    </TotalsMetric>
                    <TotalsMetric label="Today" value={`$${formatMoney(totals.today)}`}>
                        <span>Across {projects.length} projects</span>
                    </TotalsMetric>
                    <TotalsMetric label="Month to date" value={`$${formatMoney(totals.mtd)}`}>
                        {totals.budget > 0 ? (
                            <>
                                <span>
                                    of{" "}
                                    <span className="font-medium tabular-nums text-foreground">
                                        ${formatMoney(totals.budget)}
                                    </span>{" "}
                                    budget
                                </span>
                                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className={`h-full rounded-full ${
                                            totals.mtd > totals.budget
                                                ? "bg-danger"
                                                : totalsBudgetPct >= 80
                                                ? "bg-warning"
                                                : "bg-accent"
                                        }`}
                                        style={{ width: `${totalsBudgetPct}%` }}
                                    />
                                </div>
                            </>
                        ) : (
                            <span>No project-level budgets set</span>
                        )}
                    </TotalsMetric>
                    <TotalsMetric label="Month forecast" value={`$${formatMoney(totals.forecast)}`}>
                        <span>Projected end-of-month spend</span>
                    </TotalsMetric>
                </div>
            </section>

            <section className={`${cardClass} overflow-hidden p-0`}>
                <div className="flex items-baseline justify-between gap-2 border-b border-border px-6 py-4">
                    <h2 className={headingTitleClass}>Projects</h2>
                    <span className="text-xs text-muted-foreground">Sortable · {labelForRange(range)} window</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <SortHeader
                                    label="Project"
                                    sortKey="name"
                                    activeKey={sortKey}
                                    activeDir={sortDir}
                                    onSort={onSort}
                                    className="pl-6"
                                />
                                <th
                                    scope="col"
                                    className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                                >
                                    Accounts
                                </th>
                                <SortHeader
                                    label="Today"
                                    sortKey="today"
                                    activeKey={sortKey}
                                    activeDir={sortDir}
                                    onSort={onSort}
                                    align="right"
                                />
                                <SortHeader
                                    label={labelForRange(range)}
                                    sortKey="period"
                                    activeKey={sortKey}
                                    activeDir={sortDir}
                                    onSort={onSort}
                                    align="right"
                                />
                                <SortHeader
                                    label="MTD"
                                    sortKey="mtd"
                                    activeKey={sortKey}
                                    activeDir={sortDir}
                                    onSort={onSort}
                                    align="right"
                                />
                                <SortHeader
                                    label="Daily avg"
                                    sortKey="dailyAvg"
                                    activeKey={sortKey}
                                    activeDir={sortDir}
                                    onSort={onSort}
                                    align="right"
                                />
                                <SortHeader
                                    label="Forecast"
                                    sortKey="forecast"
                                    activeKey={sortKey}
                                    activeDir={sortDir}
                                    onSort={onSort}
                                    align="right"
                                />
                                <SortHeader
                                    label="Budget"
                                    sortKey="budget"
                                    activeKey={sortKey}
                                    activeDir={sortDir}
                                    onSort={onSort}
                                />
                                <SortHeader
                                    label="Top service"
                                    sortKey="topService"
                                    activeKey={sortKey}
                                    activeDir={sortDir}
                                    onSort={onSort}
                                />
                                <th
                                    scope="col"
                                    className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                                >
                                    Trend
                                </th>
                                <SortHeader
                                    label="Last sync"
                                    sortKey="lastSync"
                                    activeKey={sortKey}
                                    activeDir={sortDir}
                                    onSort={onSort}
                                    className="pr-6"
                                />
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRows.map((r) => (
                                <ProjectRowView key={r.project.id} row={r} maxPeriod={maxOf(rows, "periodTotal")} />
                            ))}
                            <tr className="border-t border-border bg-muted/40">
                                <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-foreground">
                                    Totals
                                </td>
                                <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums">
                                    {totals.accounts}
                                </td>
                                <td className="px-3 py-3 text-right text-sm font-medium tabular-nums text-foreground">
                                    ${formatMoney(totals.today)}
                                </td>
                                <td className="px-3 py-3 text-right text-sm font-medium tabular-nums text-foreground">
                                    ${formatMoney(totals.period)}
                                </td>
                                <td className="px-3 py-3 text-right text-sm font-medium tabular-nums text-foreground">
                                    ${formatMoney(totals.mtd)}
                                </td>
                                <td className="px-3 py-3 text-right text-sm tabular-nums text-muted-foreground">
                                    ${formatMoney(totalDailyAvg)}
                                </td>
                                <td className="px-3 py-3 text-right text-sm font-medium tabular-nums text-foreground">
                                    ${formatMoney(totals.forecast)}
                                </td>
                                <td className="px-3 py-3">
                                    {totals.budget > 0 ? (
                                        <BudgetCell spend={totals.mtd} budget={totals.budget} />
                                    ) : (
                                        <span className="text-xs text-subtle-foreground">—</span>
                                    )}
                                </td>
                                <td className="px-3 py-3 text-xs text-muted-foreground">—</td>
                                <td className="px-3 py-3 text-xs text-muted-foreground">—</td>
                                <td className="px-6 py-3 text-xs text-muted-foreground">—</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <p className="text-xs text-muted-foreground">
                Costs come from each cloud&rsquo;s billing API. Today and forecast values are computed from
                month-to-date spend on the server.
            </p>
        </div>
    );
}

function labelForRange(r: RangeKey): string {
    switch (r) {
        case "7d":
            return "7 days";
        case "30d":
            return "30 days";
        case "mtd":
            return "Month to date";
        case "90d":
            return "90 days";
    }
}

function maxOf(rows: ProjectRow[], key: "periodTotal"): number {
    return rows.reduce((m, r) => (r[key] > m ? r[key] : m), 0);
}

function RangeToggle({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
    return (
        <div
            className="inline-flex rounded-md border border-border bg-surface p-0.5"
            role="tablist"
            aria-label="Comparison window"
        >
            {RANGE_OPTIONS.map((opt) => {
                const active = opt.key === value;
                return (
                    <button
                        key={opt.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(opt.key)}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                            active
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function TotalsMetric({
    label,
    value,
    children
}: {
    label: string;
    value: string;
    children?: React.ReactNode;
}) {
    return (
        <div>
            <p className={metricLabelClass}>{label}</p>
            <p className="mt-2 font-serif text-2xl font-medium leading-none tabular-nums text-foreground">
                {value}
            </p>
            <div className="mt-2 text-xs text-muted-foreground">{children}</div>
        </div>
    );
}

function ProjectRowView({ row, maxPeriod }: { row: ProjectRow; maxPeriod: number }) {
    const pct = maxPeriod > 0 ? (row.periodTotal / maxPeriod) * 100 : 0;
    const accounts = row.project.cloudAccounts;
    const providerSet = Array.from(new Set(accounts.map((a) => providerLabel(a.provider))));
    return (
        <tr className="border-t border-border align-middle hover:bg-muted/30">
            <td className="whitespace-nowrap py-3 pl-6 pr-3">
                <Link
                    href={`/dashboard/projects/${row.project.id}`}
                    className="text-sm font-medium text-foreground hover:text-accent"
                >
                    {row.project.name}
                </Link>
                <p className="text-[11px] text-muted-foreground">{row.project.timezone}</p>
            </td>
            <td className="px-3 py-3">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs tabular-nums text-foreground">{accounts.length}</span>
                    <div className="flex flex-wrap gap-1">
                        {providerSet.map((p) => (
                            <ProviderChip key={p} provider={p} />
                        ))}
                    </div>
                </div>
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-foreground">
                ${formatMoney(Number(row.summary?.todaySpend ?? 0))}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-right">
                <div className="flex flex-col items-end gap-1">
                    <span className="font-medium tabular-nums text-foreground">
                        ${formatMoney(row.periodTotal)}
                    </span>
                    <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                </div>
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-foreground">
                ${formatMoney(Number(row.summary?.monthSpend ?? 0))}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-muted-foreground">
                ${formatMoney(row.dailyAvg)}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-foreground">
                ${formatMoney(Number(row.summary?.monthForecast ?? 0))}
            </td>
            <td className="px-3 py-3">
                <BudgetCell spend={Number(row.summary?.monthSpend ?? 0)} budget={row.monthlyBudget} />
            </td>
            <td className="max-w-[180px] px-3 py-3">
                {row.topService ? (
                    <div>
                        <p className="truncate text-sm text-foreground" title={row.topService.name}>
                            {row.topService.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                            {compactMoney(row.topService.amount)}
                        </p>
                    </div>
                ) : (
                    <span className="text-xs text-subtle-foreground">—</span>
                )}
            </td>
            <td className="px-3 py-3">
                <div className="h-8 w-24 text-accent">
                    {row.spark.some((v) => v > 0) ? (
                        <Sparkline values={row.spark} title={`${row.project.name} trend`} />
                    ) : (
                        <span className="text-xs text-subtle-foreground">—</span>
                    )}
                </div>
            </td>
            <td className="whitespace-nowrap py-3 pl-3 pr-6 text-xs text-muted-foreground">
                {formatRelative(row.lastSync)}
            </td>
        </tr>
    );
}

function SkelLine({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded bg-muted-strong/60 ${className}`} />;
}

function CompareSkeleton() {
    return (
        <div className="space-y-6">
            <div className={pageHeaderClass}>
                <div className="space-y-2">
                    <SkelLine className="h-7 w-32" />
                    <SkelLine className="h-4 w-56" />
                </div>
                <SkelLine className="h-9 w-48" />
            </div>
            <div className={cardClass}>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <SkelLine className="h-3 w-24" />
                            <SkelLine className="h-7 w-28" />
                            <SkelLine className="h-3 w-32" />
                        </div>
                    ))}
                </div>
            </div>
            <div className={cardClass}>
                <SkelLine className="h-4 w-32" />
                <div className="mt-5 space-y-3">
                    {[0, 1, 2].map((i) => (
                        <SkelLine key={i} className="h-8 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}
