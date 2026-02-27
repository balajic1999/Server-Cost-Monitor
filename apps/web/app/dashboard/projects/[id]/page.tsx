"use client";

import { useEffect, useState, FormEvent, ReactNode } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "../../../../contexts/AuthContext";
import {
    getProject, Project,
    getProjectCostSummary, CostSummary,
    listCloudAccounts, createCloudAccount, deleteCloudAccount, CloudAccount,
    fetchCosts, getCostRecords, CostRecord,
    listAlertRules, createAlertRule, deleteAlertRule, AlertRule,
    getAlertHistory, AlertSent,
} from "../../../../lib/api";
import { useToast } from "../../../../contexts/ToastContext";

type Tab = "overview" | "accounts" | "alerts";

export default function ProjectDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { token } = useAuth();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tab, setTab] = useState<Tab>("overview");

    useEffect(() => {
        if (!token || !id) return;
        getProject(token, id)
            .then(setProject)
            .catch((e) => setError((e as Error).message))
            .finally(() => setLoading(false));
    }, [token, id]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="rounded-2xl border border-red-800/50 bg-red-950/30 p-8 text-center">
                <p className="text-red-300">{error || "Project not found"}</p>
            </div>
        );
    }

    const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
        {
            key: "overview", label: "Overview", icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
            ),
        },
        {
            key: "accounts", label: "Cloud Accounts", icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                </svg>
            ),
        },
        {
            key: "alerts", label: "Alerts", icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
            ),
        },
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                <p className="mt-1 text-sm text-slate-400">
                    Timezone: {project.timezone} · Created {new Date(project.createdAt).toLocaleDateString()}
                </p>
            </div>

            {/* Tabs */}
            <div className="mb-6 flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.key
                            ? "bg-slate-800 text-white shadow"
                            : "text-slate-400 hover:text-slate-200"
                            }`}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === "overview" && <OverviewTab projectId={id} />}
            {tab === "accounts" && <AccountsTab projectId={id} />}
            {tab === "alerts" && <AlertsTab projectId={id} />}
        </div>
    );
}

/* ─── Overview Tab ─────────────────────────────────────── */

function OverviewTab({ projectId }: { projectId: string }) {
    const { token } = useAuth();
    const [summary, setSummary] = useState<CostSummary | null>(null);
    const [records, setRecords] = useState<CostRecord[]>([]);
    const [accounts, setAccounts] = useState<CloudAccount[]>([]);
    const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
    const [loading, setLoading] = useState(true);

    // Date range state
    type RangePreset = "7d" | "14d" | "30d" | "90d" | "custom";
    const [rangePreset, setRangePreset] = useState<RangePreset>("30d");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");

    function getDateRange() {
        const today = new Date();
        const endDate = today.toISOString().split("T")[0];
        if (rangePreset === "custom" && customStart && customEnd) {
            return { startDate: customStart, endDate: customEnd };
        }
        const daysMap: Record<string, number> = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };
        const days = daysMap[rangePreset] ?? 30;
        const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];
        return { startDate, endDate };
    }

    const rangeLabelMap: Record<string, string> = {
        "7d": "Last 7 Days",
        "14d": "Last 14 Days",
        "30d": "Last 30 Days",
        "90d": "Last 90 Days",
        custom: customStart && customEnd ? `${customStart} → ${customEnd}` : "Custom Range",
    };

    useEffect(() => {
        if (!token) return;
        if (rangePreset === "custom" && (!customStart || !customEnd)) return;

        setLoading(true);
        const { startDate, endDate } = getDateRange();

        Promise.all([
            getProjectCostSummary(token, projectId).catch(() => null),
            listCloudAccounts(token, projectId).catch(() => [] as CloudAccount[]),
            listAlertRules(token, projectId).catch(() => [] as AlertRule[]),
        ])
            .then(async ([s, accs, rules]) => {
                if (s) setSummary(s);
                setAccounts(accs);
                setAlertRules(rules);
                const allRecords = await Promise.all(
                    accs.map((acc) =>
                        getCostRecords(token, acc.id, startDate, endDate).catch(
                            () => [] as CostRecord[]
                        )
                    )
                );
                setRecords(allRecords.flat());
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [token, projectId, rangePreset, customStart, customEnd]);

    // CSV export helper
    function downloadCSV() {
        if (records.length === 0) return;
        const headers = ["Date", "Service", "Amount", "Currency"];
        const rows = records.map((r) => [
            r.periodStart.split("T")[0],
            r.serviceName,
            Number(r.amount).toFixed(4),
            r.currency,
        ]);
        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cost-report-${projectId.slice(0, 8)}-${getDateRange().startDate}-to-${getDateRange().endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (loading) {
        return <LoadingSpinner />;
    }

    // Derived data
    const totalSpend = records.reduce((s, r) => s + Number(r.amount), 0);
    const byDate = records.reduce<Record<string, number>>((acc, r) => {
        const date = r.periodStart.split("T")[0];
        acc[date] = (acc[date] ?? 0) + Number(r.amount);
        return acc;
    }, {});
    const dailyEntries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    const avgDailySpend = dailyEntries.length > 0 ? totalSpend / dailyEntries.length : 0;

    // Budget from alert rules (use first rule that has budgets)
    const ruleWithDailyBudget = alertRules.find((r) => r.dailyBudget != null && Number(r.dailyBudget) > 0);
    const ruleWithMonthlyBudget = alertRules.find((r) => r.monthlyBudget != null && Number(r.monthlyBudget) > 0);
    const dailyBudget = ruleWithDailyBudget ? Number(ruleWithDailyBudget.dailyBudget) : undefined;
    const monthlyBudget = ruleWithMonthlyBudget ? Number(ruleWithMonthlyBudget.monthlyBudget) : undefined;

    // Service breakdown
    const byService = records.reduce<Record<string, number>>((acc, r) => {
        acc[r.serviceName] = (acc[r.serviceName] ?? 0) + Number(r.amount);
        return acc;
    }, {});
    const topServices = Object.entries(byService)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8);
    const maxServiceSpend = topServices.length > 0 ? topServices[0][1] : 1;

    const serviceColors = [
        "from-indigo-500 to-indigo-400",
        "from-violet-500 to-violet-400",
        "from-cyan-500 to-cyan-400",
        "from-emerald-500 to-emerald-400",
        "from-amber-500 to-amber-400",
        "from-rose-500 to-rose-400",
        "from-fuchsia-500 to-fuchsia-400",
        "from-sky-500 to-sky-400",
    ];

    const hasData = records.length > 0;

    return (
        <div className="space-y-6">
            {/* Date range selector + CSV export */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
                    {(["7d", "14d", "30d", "90d"] as const).map((preset) => (
                        <button
                            key={preset}
                            onClick={() => setRangePreset(preset)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${rangePreset === preset
                                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                                }`}
                        >
                            {preset.toUpperCase()}
                        </button>
                    ))}
                    <button
                        onClick={() => setRangePreset("custom")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${rangePreset === "custom"
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                    >
                        Custom
                    </button>
                </div>
                {rangePreset === "custom" && (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                        />
                        <span className="text-xs text-slate-500">to</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                        />
                    </div>
                )}
                <button
                    onClick={downloadCSV}
                    disabled={records.length === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export CSV
                </button>
            </div>

            {/* Stats grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Today's Spend"
                    value={`$${Number(summary?.todaySpend ?? 0).toFixed(2)}`}
                    accent="indigo"
                    budget={dailyBudget}
                    spent={Number(summary?.todaySpend ?? 0)}
                    icon={
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <StatCard
                    label="This Month"
                    value={`$${Number(summary?.monthSpend ?? 0).toFixed(2)}`}
                    accent="violet"
                    budget={monthlyBudget}
                    spent={Number(summary?.monthSpend ?? 0)}
                    icon={
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                    }
                />
                <StatCard
                    label="Monthly Forecast"
                    value={`$${Number(summary?.monthForecast ?? 0).toFixed(2)}`}
                    accent="emerald"
                    budget={monthlyBudget}
                    spent={Number(summary?.monthForecast ?? 0)}
                    icon={
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                        </svg>
                    }
                />
                <StatCard
                    label="Avg Daily Spend"
                    value={`$${avgDailySpend.toFixed(2)}`}
                    accent="amber"
                    icon={
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                        </svg>
                    }
                />
            </div>

            {hasData ? (
                <>
                    {/* Cost chart with axis labels */}
                    <CostBarChart records={records} avgDailySpend={avgDailySpend} rangeLabel={rangeLabelMap[rangePreset]} />

                    {/* Two-column layout: top services + daily breakdown */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Top Services */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Top Services</h3>
                                <span className="text-xs text-slate-500">{Object.keys(byService).length} services total</span>
                            </div>
                            <div className="space-y-3">
                                {topServices.map(([service, amount], i) => {
                                    const pct = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
                                    return (
                                        <div key={service}>
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span className="text-sm text-slate-300 truncate max-w-[200px]" title={service}>{service}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                                                    <span className="text-sm font-semibold text-white">${amount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                                                <div
                                                    className={`h-full rounded-full bg-gradient-to-r ${serviceColors[i % serviceColors.length]} transition-all duration-700`}
                                                    style={{ width: `${(amount / maxServiceSpend) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                {topServices.length === 0 && (
                                    <p className="text-sm text-slate-500 text-center py-4">No service data available</p>
                                )}
                            </div>
                        </div>

                        {/* Daily Cost Breakdown */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Daily Breakdown</h3>
                                <span className="text-xs text-slate-500">{dailyEntries.length} days</span>
                            </div>
                            <div className="max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-left">
                                            <th className="pb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                                            <th className="pb-2 text-xs font-medium uppercase tracking-wider text-slate-500 text-right">Amount</th>
                                            <th className="pb-2 text-xs font-medium uppercase tracking-wider text-slate-500 w-24"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...dailyEntries].reverse().map(([date, amount]) => {
                                            const maxDaily = Math.max(...dailyEntries.map(([, v]) => v), 1);
                                            const barWidth = (amount / maxDaily) * 100;
                                            const isHigh = amount > avgDailySpend * 1.5;
                                            return (
                                                <tr key={date} className="border-b border-slate-800/50 transition hover:bg-slate-800/30">
                                                    <td className="py-2.5 text-sm text-slate-300">
                                                        {new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}
                                                    </td>
                                                    <td className={`py-2.5 text-sm font-medium text-right ${isHigh ? "text-amber-400" : "text-white"}`}>
                                                        ${amount.toFixed(2)}
                                                        {isHigh && <span className="ml-1 text-[10px]">🔺</span>}
                                                    </td>
                                                    <td className="py-2.5 pl-3">
                                                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${isHigh ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
                                                                style={{ width: `${barWidth}%` }}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Period Total</span>
                                <span className="text-lg font-bold text-white">${totalSpend.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Cloud accounts status */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                        <h3 className="mb-4 text-lg font-semibold text-white">Connected Accounts</h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {accounts.map((acc) => (
                                <div key={acc.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/30 px-4 py-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                                        <span className="text-sm font-bold text-amber-400">A</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-white truncate">{acc.accountLabel}</p>
                                        <p className="text-xs text-slate-500">{acc.externalAccountId}</p>
                                    </div>
                                    <span className={`h-2 w-2 rounded-full ${acc.isActive ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-slate-500"}`} />
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                /* Empty state */
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10">
                    <div className="mx-auto max-w-md text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20">
                            <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white">No cost data yet</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            Connect a cloud account from the <strong className="text-slate-300">Cloud Accounts</strong> tab, then click <strong className="text-slate-300">Fetch Costs</strong> to start tracking your spending.
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">1</span>
                            <span>Add account</span>
                            <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-bold">2</span>
                            <span>Fetch costs</span>
                            <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">3</span>
                            <span>View insights</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CostBarChart({ records, avgDailySpend, rangeLabel }: { records: CostRecord[]; avgDailySpend: number; rangeLabel: string }) {
    const byDate = records.reduce<Record<string, number>>((acc, r) => {
        const date = r.periodStart.split("T")[0];
        acc[date] = (acc[date] ?? 0) + Number(r.amount);
        return acc;
    }, {});

    const entries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
    const maxVal = Math.max(...entries.map(([, v]) => v), 1);
    const totalDays = entries.length;

    // Y-axis labels
    const yLabels = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="mb-1 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Cost Trend ({rangeLabel})</h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-indigo-500 to-violet-500" />
                        <span className="text-xs text-slate-400">Daily cost</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-[2px] w-4 border-t-2 border-dashed border-amber-500/60" />
                        <span className="text-xs text-slate-400">Avg (${avgDailySpend.toFixed(2)})</span>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex">
                {/* Y-axis */}
                <div className="flex flex-col justify-between pr-3 text-right" style={{ height: "220px" }}>
                    {[...yLabels].reverse().map((val, i) => (
                        <span key={i} className="text-[10px] text-slate-500 leading-none">${val.toFixed(val >= 10 ? 0 : 2)}</span>
                    ))}
                </div>
                {/* Chart area */}
                <div className="relative flex-1">
                    {/* Horizontal grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: "220px" }}>
                        {yLabels.map((_, i) => (
                            <div key={i} className="border-b border-slate-800/60" />
                        ))}
                    </div>
                    {/* Average line */}
                    {avgDailySpend > 0 && (
                        <div
                            className="absolute left-0 right-0 border-t-2 border-dashed border-amber-500/40 pointer-events-none z-10"
                            style={{ bottom: `${(avgDailySpend / maxVal) * 220}px` }}
                        />
                    )}
                    {/* Bars */}
                    <div className="relative flex items-end gap-[2px]" style={{ height: "220px" }}>
                        {entries.map(([date, amount], i) => {
                            const isHigh = amount > avgDailySpend * 1.5;
                            return (
                                <div key={date} className="group relative flex-1 flex flex-col justify-end h-full">
                                    <div
                                        className={`rounded-t transition-all duration-300 cursor-pointer ${isHigh
                                            ? "bg-gradient-to-t from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300"
                                            : "bg-gradient-to-t from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400"
                                            }`}
                                        style={{ height: `${Math.max((amount / maxVal) * 100, 1)}%`, minHeight: "3px" }}
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 hidden group-hover:block rounded-lg bg-slate-800 px-3 py-2 text-xs text-white whitespace-nowrap shadow-xl border border-slate-700 z-20">
                                        <div className="font-semibold">${amount.toFixed(2)}</div>
                                        <div className="text-slate-400 mt-0.5">
                                            {new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}
                                        </div>
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-slate-800 border-b border-r border-slate-700" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* X-axis date labels */}
                    <div className="flex mt-2">
                        {entries.map(([date], i) => {
                            // Show label every ~5 days or first/last
                            const interval = Math.max(Math.floor(totalDays / 6), 1);
                            const show = i === 0 || i === totalDays - 1 || i % interval === 0;
                            return (
                                <div key={date} className="flex-1 text-center">
                                    {show && (
                                        <span className="text-[9px] text-slate-500">
                                            {new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Cloud Accounts Tab ───────────────────────────────── */

function AccountsTab({ projectId }: { projectId: string }) {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [accounts, setAccounts] = useState<CloudAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [fetching, setFetching] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        listCloudAccounts(token, projectId)
            .then(setAccounts)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [token, projectId]);

    async function handleDelete(accountId: string) {
        if (!token || !confirm("Remove this cloud account? Cost data will be preserved.")) return;
        try {
            await deleteCloudAccount(token, accountId);
            setAccounts((a) => a.filter((x) => x.id !== accountId));
            addToast("success", "Cloud account removed successfully");
        } catch (err) {
            addToast("error", (err as Error).message);
        }
    }

    async function handleFetch(accountId: string) {
        if (!token) return;
        setFetching(accountId);
        try {
            const today = new Date();
            const endDate = today.toISOString().split("T")[0];
            const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
            const result = await fetchCosts(token, accountId, startDate, endDate);
            addToast("success", `Fetched ${result.recordsUpserted} cost records!`);
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setFetching(null);
        }
    }

    if (loading) return <LoadingSpinner />;

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Connected Accounts</h3>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Account
                </button>
            </div>

            {accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 py-16">
                    <svg className="h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                    </svg>
                    <p className="mt-3 text-sm text-slate-400">No cloud accounts connected</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                    >
                        Connect AWS Account
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {accounts.map((acc) => (
                        <div key={acc.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4 transition hover:border-slate-700">
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                                    <span className="text-lg font-bold text-amber-400">A</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{acc.accountLabel}</p>
                                    <p className="text-xs text-slate-500">{acc.provider} · {acc.externalAccountId}</p>
                                </div>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${acc.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-slate-500/10 text-slate-400 border border-slate-500/30"}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${acc.isActive ? "bg-emerald-400" : "bg-slate-500"}`} />
                                    {acc.isActive ? "Active" : "Inactive"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleFetch(acc.id)}
                                    disabled={fetching === acc.id}
                                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                                    title="Fetch costs from AWS"
                                >
                                    {fetching === acc.id ? (
                                        <span className="flex items-center gap-1">
                                            <span className="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent" />
                                            Fetching...
                                        </span>
                                    ) : "Fetch Costs"}
                                </button>
                                <button
                                    onClick={() => handleDelete(acc.id)}
                                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-950/50 hover:text-red-400"
                                    title="Remove account"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <AddAccountModal
                    projectId={projectId}
                    onClose={() => setShowModal(false)}
                    onCreated={(acc) => {
                        setAccounts((prev) => [...prev, acc]);
                        setShowModal(false);
                    }}
                />
            )}
        </div>
    );
}

function AddAccountModal({ projectId, onClose, onCreated }: { projectId: string; onClose: () => void; onCreated: (acc: CloudAccount) => void }) {
    const { token } = useAuth();
    const [authType, setAuthType] = useState<"role" | "keys">("keys");
    const [label, setLabel] = useState("");
    const [accountId, setAccountId] = useState("");
    const [roleArn, setRoleArn] = useState("");
    const [accessKey, setAccessKey] = useState("");
    const [secretKey, setSecretKey] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!token) return;
        setError("");
        setLoading(true);
        try {
            const acc = await createCloudAccount(token, {
                projectId,
                provider: "AWS",
                accountLabel: label,
                externalAccountId: accountId,
                ...(authType === "role" ? { roleArn } : { accessKey, secretKey }),
            });
            onCreated(acc);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white">Connect AWS Account</h2>
                <p className="mt-1 text-sm text-slate-400">Enter your AWS credentials to start tracking costs</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {error && (
                        <div className="rounded-lg border border-red-800/50 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-300">Account Label</label>
                        <input type="text" required value={label} onChange={(e) => setLabel(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            placeholder="e.g. Production Account" />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-300">AWS Account ID</label>
                        <input type="text" required value={accountId} onChange={(e) => setAccountId(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            placeholder="123456789012" />
                    </div>

                    {/* Auth type selector */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">Authentication Method</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setAuthType("keys")}
                                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${authType === "keys" ? "border-indigo-500 bg-indigo-500/10 text-indigo-400" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}>
                                Access Keys
                            </button>
                            <button type="button" onClick={() => setAuthType("role")}
                                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${authType === "role" ? "border-indigo-500 bg-indigo-500/10 text-indigo-400" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}>
                                IAM Role ARN
                            </button>
                        </div>
                    </div>

                    {authType === "keys" ? (
                        <>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-300">Access Key ID</label>
                                <input type="text" required value={accessKey} onChange={(e) => setAccessKey(e.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                    placeholder="AKIA..." />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-300">Secret Access Key</label>
                                <input type="password" required value={secretKey} onChange={(e) => setSecretKey(e.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                    placeholder="••••••••" />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-300">IAM Role ARN</label>
                            <input type="text" required value={roleArn} onChange={(e) => setRoleArn(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                placeholder="arn:aws:iam::123456789012:role/CostExplorerRole" />
                        </div>
                    )}

                    <div className="rounded-lg border border-amber-800/30 bg-amber-950/20 px-4 py-3">
                        <p className="text-xs text-amber-400">🔒 Credentials are encrypted with AES-256-GCM before storage and never exposed in API responses.</p>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:text-white">Cancel</button>
                        <button type="submit" disabled={loading}
                            className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50">
                            {loading ? "Connecting..." : "Connect Account"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Alerts Tab ───────────────────────────────────────── */

function AlertsTab({ projectId }: { projectId: string }) {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [rules, setRules] = useState<AlertRule[]>([]);
    const [history, setHistory] = useState<AlertSent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (!token) return;
        Promise.all([
            listAlertRules(token, projectId).catch(() => []),
            getAlertHistory(token, projectId).catch(() => []),
        ])
            .then(([r, h]) => { setRules(r); setHistory(h); })
            .finally(() => setLoading(false));
    }, [token, projectId]);

    async function handleDelete(ruleId: string) {
        if (!token || !confirm("Delete this alert rule?")) return;
        try {
            await deleteAlertRule(token, ruleId);
            setRules((r) => r.filter((x) => x.id !== ruleId));
            addToast("success", "Alert rule deleted");
        } catch (err) {
            addToast("error", (err as Error).message);
        }
    }

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-8">
            {/* Alert Rules */}
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Alert Rules</h3>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        New Rule
                    </button>
                </div>

                {rules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 py-12">
                        <svg className="h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                        </svg>
                        <p className="mt-3 text-sm text-slate-400">No alert rules configured</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rules.map((rule) => (
                            <div key={rule.id} className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        {rule.dailyBudget && (
                                            <div className="flex items-center gap-2">
                                                <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
                                                <span className="text-sm text-slate-300">Daily budget: <strong className="text-white">${Number(rule.dailyBudget).toFixed(2)}</strong></span>
                                            </div>
                                        )}
                                        {rule.monthlyBudget && (
                                            <div className="flex items-center gap-2">
                                                <span className="inline-block h-2 w-2 rounded-full bg-violet-400" />
                                                <span className="text-sm text-slate-300">Monthly budget: <strong className="text-white">${Number(rule.monthlyBudget).toFixed(2)}</strong></span>
                                            </div>
                                        )}
                                        {rule.spikeThresholdPct && (
                                            <div className="flex items-center gap-2">
                                                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                                                <span className="text-sm text-slate-300">Spike detection: <strong className="text-white">{rule.spikeThresholdPct}%</strong> above 7-day avg</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            {rule.emailEnabled && <span>📧 Email</span>}
                                            {rule.slackWebhookUrl && <span>💬 Slack</span>}
                                            <span>{rule._count.alertsSent} alert(s) sent</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(rule.id)}
                                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-950/50 hover:text-red-400">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Alert History */}
            <div>
                <h3 className="mb-4 text-lg font-semibold text-white">Recent Alerts</h3>
                {history.length === 0 ? (
                    <p className="text-sm text-slate-500">No alerts have been triggered yet.</p>
                ) : (
                    <div className="space-y-2">
                        {history.slice(0, 20).map((alert) => (
                            <div key={alert.id} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                                <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${alert.reason.includes("exceeded") ? "bg-red-500/20 text-red-400" :
                                    alert.reason.includes("spike") ? "bg-amber-500/20 text-amber-400" :
                                        "bg-indigo-500/20 text-indigo-400"
                                    }`}>
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                    </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-slate-300">{alert.reason}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        via {alert.channel.toLowerCase()} · {new Date(alert.sentAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <CreateAlertModal
                    projectId={projectId}
                    onClose={() => setShowModal(false)}
                    onCreated={(rule) => {
                        setRules((prev) => [rule, ...prev]);
                        setShowModal(false);
                    }}
                />
            )}
        </div>
    );
}

function CreateAlertModal({ projectId, onClose, onCreated }: { projectId: string; onClose: () => void; onCreated: (rule: AlertRule) => void }) {
    const { token } = useAuth();
    const [dailyBudget, setDailyBudget] = useState("");
    const [monthlyBudget, setMonthlyBudget] = useState("");
    const [spikeThreshold, setSpikeThreshold] = useState("");
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!token) return;
        if (!dailyBudget && !monthlyBudget && !spikeThreshold) {
            setError("At least one alert condition is required.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            const rule = await createAlertRule(token, {
                projectId,
                ...(dailyBudget ? { dailyBudget: parseFloat(dailyBudget) } : {}),
                ...(monthlyBudget ? { monthlyBudget: parseFloat(monthlyBudget) } : {}),
                ...(spikeThreshold ? { spikeThresholdPct: parseInt(spikeThreshold) } : {}),
                emailEnabled,
                ...(slackWebhookUrl ? { slackWebhookUrl } : {}),
            });
            onCreated(rule);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white">New Alert Rule</h2>
                <p className="mt-1 text-sm text-slate-400">Get notified when spending exceeds thresholds</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {error && <div className="rounded-lg border border-red-800/50 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</div>}

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-300">Daily Budget ($)</label>
                        <input type="number" step="0.01" min="0" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            placeholder="e.g. 50.00" />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-300">Monthly Budget ($)</label>
                        <input type="number" step="0.01" min="0" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            placeholder="e.g. 1000.00" />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-300">Spike Threshold (%)</label>
                        <input type="number" min="10" max="1000" value={spikeThreshold} onChange={(e) => setSpikeThreshold(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            placeholder="e.g. 50 (triggers at 50% above avg)" />
                    </div>

                    {/* Notification channels */}
                    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Notification Channels</p>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30" />
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-300">📧 Email notifications</span>
                            </div>
                        </label>

                        <div>
                            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300">
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                                </svg>
                                Slack notifications
                            </label>
                            <input type="url" value={slackWebhookUrl} onChange={(e) => setSlackWebhookUrl(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                placeholder="https://hooks.slack.com/services/..." />
                            <p className="mt-1 text-[11px] text-slate-500">Create a webhook at <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">api.slack.com/messaging/webhooks</a></p>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:text-white">Cancel</button>
                        <button type="submit" disabled={loading}
                            className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50">
                            {loading ? "Creating..." : "Create Rule"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Shared Components ────────────────────────────────── */

function StatCard({ label, value, accent, icon, budget, spent }: {
    label: string; value: string; accent: string; icon: ReactNode;
    budget?: number; spent?: number;
}) {
    const colors: Record<string, string> = {
        indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-400",
        violet: "from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400",
        emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
        amber: "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400",
    };

    const hasBudget = budget != null && budget > 0 && spent != null;
    const pct = hasBudget ? Math.min((spent / budget) * 100, 100) : 0;
    const overBudget = hasBudget && spent > budget;

    // Color based on utilization
    const barColor = overBudget
        ? "bg-gradient-to-r from-red-500 to-red-400"
        : pct > 85
            ? "bg-gradient-to-r from-amber-500 to-orange-400"
            : pct > 60
                ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                : "bg-gradient-to-r from-emerald-500 to-emerald-400";

    return (
        <div className={`rounded-xl border bg-gradient-to-br p-5 ${colors[accent] || colors.indigo}`}>
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
                {icon}
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{value}</p>
            {hasBudget && (
                <div className="mt-3">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                        <span className={`text-[10px] font-medium ${overBudget ? "text-red-400" : pct > 85 ? "text-amber-400" : "text-slate-500"}`}>
                            {overBudget ? `⚠ ${pct.toFixed(0)}% — over budget!` : `${pct.toFixed(0)}% of $${budget.toFixed(0)} budget`}
                        </span>
                        <span className="text-[10px] text-slate-600">${(budget - spent).toFixed(2)} left</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function LoadingSpinner() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Skeleton stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-5">
                        <div className="flex items-center justify-between">
                            <div className="h-3 w-20 rounded animate-shimmer" />
                            <div className="h-5 w-5 rounded animate-shimmer" />
                        </div>
                        <div className="mt-3 h-7 w-24 rounded animate-shimmer" />
                    </div>
                ))}
            </div>
            {/* Skeleton chart */}
            <div className="rounded-2xl border border-slate-800/50 bg-slate-900/30 p-6">
                <div className="h-5 w-48 rounded animate-shimmer" />
                <div className="mt-6 flex items-end gap-[3px] h-44">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="flex-1 rounded-t animate-shimmer" style={{ height: `${30 + Math.random() * 60}%` }} />
                    ))}
                </div>
            </div>
            {/* Skeleton panels */}
            <div className="grid gap-6 lg:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-slate-800/50 bg-slate-900/30 p-6">
                        <div className="h-5 w-36 rounded animate-shimmer" />
                        <div className="mt-4 space-y-3">
                            {[...Array(4)].map((_, j) => (
                                <div key={j} className="h-4 rounded animate-shimmer" style={{ width: `${60 + Math.random() * 30}%` }} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
