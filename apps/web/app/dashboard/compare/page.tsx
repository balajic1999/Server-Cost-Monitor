"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import {
    listProjects, Project,
    getProjectCostSummary, CostSummary,
    listCloudAccounts, getCostRecords, CostRecord,
} from "../../../lib/api";

interface ProjectData {
    project: Project;
    summary: CostSummary | null;
    records: CostRecord[];
    byService: Record<string, number>;
    dailyCosts: Record<string, number>;
}

export default function ComparePage() {
    const { token } = useAuth();
    const [data, setData] = useState<ProjectData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const projects = await listProjects(token);
            setAllProjects(projects);

            // Fetch data for all projects in parallel
            const results: ProjectData[] = await Promise.all(
                projects.map(async (project) => {
                    let summary: CostSummary | null = null;
                    let records: CostRecord[] = [];
                    try {
                        summary = await getProjectCostSummary(token, project.id);
                    } catch { /* empty */ }
                    try {
                        const accounts = await listCloudAccounts(token, project.id);
                        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
                        const allRecords = await Promise.all(
                            accounts.map((a) => getCostRecords(token, a.id, thirtyDaysAgo).catch(() => [] as CostRecord[]))
                        );
                        records = allRecords.flat();
                    } catch { /* empty */ }

                    const byService: Record<string, number> = {};
                    const dailyCosts: Record<string, number> = {};
                    records.forEach((r) => {
                        byService[r.serviceName] = (byService[r.serviceName] || 0) + Number(r.amount);
                        const date = r.periodStart.split("T")[0];
                        dailyCosts[date] = (dailyCosts[date] || 0) + Number(r.amount);
                    });

                    return { project, summary, records, byService, dailyCosts };
                })
            );

            setData(results);
            setSelectedIds(results.map((r) => r.project.id)); // all selected by default
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const filtered = data.filter((d) => selectedIds.includes(d.project.id));
    const grandTotal = filtered.reduce((s, d) => s + (d.summary?.monthSpend ?? 0), 0);
    const maxMonth = Math.max(...filtered.map((d) => d.summary?.monthSpend ?? 0), 1);

    // Build unified date range for trend chart
    const allDates = new Set<string>();
    filtered.forEach((d) => Object.keys(d.dailyCosts).forEach((dt) => allDates.add(dt)));
    const sortedDates = [...allDates].sort();

    // Project colors
    const PROJECT_COLORS = [
        { bar: "from-indigo-500 to-violet-500", dot: "bg-indigo-500", text: "text-indigo-400", light: "bg-indigo-500/10" },
        { bar: "from-emerald-500 to-teal-500", dot: "bg-emerald-500", text: "text-emerald-400", light: "bg-emerald-500/10" },
        { bar: "from-amber-500 to-orange-500", dot: "bg-amber-500", text: "text-amber-400", light: "bg-amber-500/10" },
        { bar: "from-rose-500 to-pink-500", dot: "bg-rose-500", text: "text-rose-400", light: "bg-rose-500/10" },
        { bar: "from-cyan-500 to-blue-500", dot: "bg-cyan-500", text: "text-cyan-400", light: "bg-cyan-500/10" },
    ];

    function getColor(i: number) {
        return PROJECT_COLORS[i % PROJECT_COLORS.length];
    }

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-4 p-2">
                <div className="h-8 w-64 animate-shimmer rounded-lg bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 animate-shimmer rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]" />
                ))}
            </div>
        );
    }

    if (allProjects.length < 2) {
        return (
            <div className="max-w-5xl mx-auto p-2">
                <h1 className="text-2xl font-bold text-white mb-4">Compare Projects</h1>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
                        <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                        </svg>
                    </div>
                    <p className="text-lg font-semibold text-white mb-1">Need at least 2 projects to compare</p>
                    <p className="text-sm text-slate-400">Create more projects from the Projects page to see side-by-side cost comparison.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-2">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Compare Projects</h1>
                <p className="mt-1 text-sm text-slate-400">Side-by-side cost comparison across all projects</p>
            </div>

            {/* Project selector chips */}
            <div className="flex flex-wrap gap-2">
                {allProjects.map((p, i) => {
                    const isSelected = selectedIds.includes(p.id);
                    const color = getColor(i);
                    return (
                        <button
                            key={p.id}
                            onClick={() => {
                                setSelectedIds((prev) =>
                                    isSelected ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                                );
                            }}
                            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition border ${isSelected
                                    ? `${color.light} border-transparent ${color.text}`
                                    : "bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-300"
                                }`}
                        >
                            <div className={`h-2.5 w-2.5 rounded-full ${isSelected ? color.dot : "bg-slate-700"}`} />
                            {p.name}
                        </button>
                    );
                })}
            </div>

            {filtered.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
                    <p className="text-slate-400">Select at least one project to see comparison data.</p>
                </div>
            ) : (
                <>
                    {/* ─── Overview Cards ─── */}
                    <div className="grid gap-4 sm:grid-cols-3">
                        <StatCard
                            label="Total Today"
                            value={`$${filtered.reduce((s, d) => s + (d.summary?.todaySpend ?? 0), 0).toFixed(2)}`}
                            sub={`Across ${filtered.length} project${filtered.length > 1 ? "s" : ""}`}
                        />
                        <StatCard
                            label="Total This Month"
                            value={`$${grandTotal.toFixed(2)}`}
                            sub="Combined monthly spend"
                        />
                        <StatCard
                            label="Total Forecast"
                            value={`$${filtered.reduce((s, d) => s + (d.summary?.monthForecast ?? 0), 0).toFixed(2)}`}
                            sub="Projected end-of-month"
                        />
                    </div>

                    {/* ─── Monthly Spend Bar Comparison ─── */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                        <h2 className="text-lg font-semibold text-white mb-1">Monthly Spend Comparison</h2>
                        <p className="text-xs text-slate-500 mb-5">Current month spend per project</p>
                        <div className="space-y-4">
                            {filtered
                                .sort((a, b) => (b.summary?.monthSpend ?? 0) - (a.summary?.monthSpend ?? 0))
                                .map((d, i) => {
                                    const spend = d.summary?.monthSpend ?? 0;
                                    const pct = grandTotal > 0 ? (spend / grandTotal) * 100 : 0;
                                    const barW = maxMonth > 0 ? (spend / maxMonth) * 100 : 0;
                                    const color = getColor(allProjects.findIndex((p) => p.id === d.project.id));
                                    return (
                                        <div key={d.project.id}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-3 w-3 rounded-full ${color.dot}`} />
                                                    <span className="text-sm font-medium text-white">{d.project.name}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                                                    <span className="text-sm font-bold text-white">${spend.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="h-4 rounded-full bg-slate-800 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full bg-gradient-to-r ${color.bar} transition-all duration-700 ease-out`}
                                                    style={{ width: `${barW}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* ─── Daily Trend Comparison ─── */}
                    {sortedDates.length > 1 && (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                            <h2 className="text-lg font-semibold text-white mb-1">Daily Spend Trend</h2>
                            <p className="text-xs text-slate-500 mb-5">Last 30 days, per project</p>

                            {/* Chart area */}
                            <div className="relative h-48">
                                {/* Y-axis grid lines */}
                                {[0, 25, 50, 75, 100].map((pct) => (
                                    <div
                                        key={pct}
                                        className="absolute left-0 right-0 border-t border-slate-800/50"
                                        style={{ bottom: `${pct}%` }}
                                    />
                                ))}

                                {/* SVG overlay for line chart */}
                                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                    {filtered.map((d, idx) => {
                                        const color = getColor(allProjects.findIndex((p) => p.id === d.project.id));
                                        const maxDailyAll = Math.max(
                                            ...filtered.flatMap((fd) => Object.values(fd.dailyCosts)),
                                            1
                                        );
                                        const points = sortedDates.map((date, xi) => {
                                            const x = (xi / (sortedDates.length - 1)) * 100;
                                            const y = 100 - ((d.dailyCosts[date] || 0) / maxDailyAll) * 95;
                                            return `${x},${y}`;
                                        });

                                        const strokeColors = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4"];
                                        const strokeColor = strokeColors[allProjects.findIndex((p) => p.id === d.project.id) % strokeColors.length];

                                        return (
                                            <polyline
                                                key={d.project.id}
                                                points={points.join(" ")}
                                                fill="none"
                                                stroke={strokeColor}
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                vectorEffect="non-scaling-stroke"
                                                opacity={0.85}
                                            />
                                        );
                                    })}
                                </svg>
                            </div>

                            {/* X-axis labels */}
                            <div className="flex justify-between mt-2">
                                {sortedDates.filter((_, i) => {
                                    const interval = Math.max(Math.floor(sortedDates.length / 6), 1);
                                    return i === 0 || i === sortedDates.length - 1 || i % interval === 0;
                                }).map((date) => (
                                    <span key={date} className="text-[9px] text-slate-500">
                                        {new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </span>
                                ))}
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-slate-800/50">
                                {filtered.map((d) => {
                                    const color = getColor(allProjects.findIndex((p) => p.id === d.project.id));
                                    return (
                                        <div key={d.project.id} className="flex items-center gap-2">
                                            <div className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
                                            <span className="text-xs text-slate-400">{d.project.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ─── Detailed Comparison Table ─── */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                        <div className="p-5 border-b border-slate-800">
                            <h2 className="text-lg font-semibold text-white">Detailed Comparison</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-800">
                                        <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">Metric</th>
                                        {filtered.map((d, i) => {
                                            const color = getColor(allProjects.findIndex((p) => p.id === d.project.id));
                                            return (
                                                <th key={d.project.id} className="px-5 py-3 text-xs font-medium text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className={`h-2 w-2 rounded-full ${color.dot}`} />
                                                        <span className={color.text}>{d.project.name}</span>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    <CompRow label="Today's Spend" values={filtered.map((d) => d.summary?.todaySpend ?? 0)} />
                                    <CompRow label="Month Spend" values={filtered.map((d) => d.summary?.monthSpend ?? 0)} highlight />
                                    <CompRow label="Month Forecast" values={filtered.map((d) => d.summary?.monthForecast ?? 0)} />
                                    <CompRow label="Avg Daily (30d)" values={filtered.map((d) => {
                                        const days = Object.keys(d.dailyCosts).length || 1;
                                        const total = Object.values(d.dailyCosts).reduce((s, v) => s + v, 0);
                                        return total / days;
                                    })} />
                                    <CompRow label="Peak Day (30d)" values={filtered.map((d) => Math.max(...Object.values(d.dailyCosts), 0))} />
                                    <CompRow label="Services Used" values={filtered.map((d) => Object.keys(d.byService).length)} isCurrency={false} />
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ─── Top Services Per Project ─── */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {filtered.map((d) => {
                            const color = getColor(allProjects.findIndex((p) => p.id === d.project.id));
                            const topSvc = Object.entries(d.byService).sort(([, a], [, b]) => b - a).slice(0, 6);
                            const maxSvc = topSvc.length > 0 ? topSvc[0][1] : 1;
                            return (
                                <div key={d.project.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className={`h-3 w-3 rounded-full ${color.dot}`} />
                                        <h3 className="text-sm font-semibold text-white">{d.project.name} — Top Services</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {topSvc.map(([svc, amt]) => (
                                            <div key={svc}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs text-slate-300 truncate mr-3">{svc}</span>
                                                    <span className="text-xs font-semibold text-white">${amt.toFixed(2)}</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full bg-gradient-to-r ${color.bar}`}
                                                        style={{ width: `${(amt / maxSvc) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {topSvc.length === 0 && (
                                            <p className="text-xs text-slate-500">No cost data available</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

/* ── Helper Components ──────────────────────────── */

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs text-slate-500 font-medium">{label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
        </div>
    );
}

function CompRow({ label, values, highlight, isCurrency = true }: { label: string; values: number[]; highlight?: boolean; isCurrency?: boolean }) {
    const max = Math.max(...values, 0.01);
    return (
        <tr className={`border-b border-slate-800/50 ${highlight ? "bg-indigo-500/5" : ""}`}>
            <td className="px-5 py-3 text-slate-400 font-medium">{label}</td>
            {values.map((v, i) => {
                const isMax = v === max && values.filter((x) => x === max).length === 1;
                return (
                    <td key={i} className="px-5 py-3 text-right">
                        <span className={`font-semibold ${isMax ? "text-indigo-400" : "text-white"}`}>
                            {isCurrency ? `$${v.toFixed(2)}` : v}
                        </span>
                    </td>
                );
            })}
        </tr>
    );
}
