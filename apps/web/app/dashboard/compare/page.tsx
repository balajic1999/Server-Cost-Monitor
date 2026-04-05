"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
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
    totalSpend: number;
    avgDaily: number;
    peakDay: number;
    peakDayDate: string;
    serviceCount: number;
}

type RangePreset = "7d" | "14d" | "30d" | "90d";

export default function ComparePage() {

    const { addToast } = useToast();
    const [data, setData] = useState<ProjectData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [rangePreset, setRangePreset] = useState<RangePreset>("30d");
    const [hoveredBar, setHoveredBar] = useState<{ projectId: string; date: string } | null>(null);

    function getDaysFromPreset(preset: RangePreset): number {
        const map: Record<RangePreset, number> = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };
        return map[preset];
    }

    const load = useCallback(async () => {

        setLoading(true);
        try {
            const projects = await listProjects();
            setAllProjects(projects);

            const days = getDaysFromPreset(rangePreset);
            const startDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

            const results: ProjectData[] = await Promise.all(
                projects.map(async (project) => {
                    let summary: CostSummary | null = null;
                    let records: CostRecord[] = [];
                    try {
                        summary = await getProjectCostSummary(project.id);
                    } catch { /* empty */ }
                    try {
                        const accounts = await listCloudAccounts(project.id);
                        const allRecords = await Promise.all(
                            accounts.map((a) => getCostRecords(a.id, startDate).catch(() => [] as CostRecord[]))
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

                    const totalSpend = Object.values(dailyCosts).reduce((s, v) => s + v, 0);
                    const dayCount = Object.keys(dailyCosts).length || 1;
                    const avgDaily = totalSpend / dayCount;
                    const dailyEntries = Object.entries(dailyCosts);
                    const peakEntry = dailyEntries.reduce((best, curr) => curr[1] > best[1] ? curr : best, ["", 0] as [string, number]);

                    return {
                        project, summary, records, byService, dailyCosts,
                        totalSpend,
                        avgDaily,
                        peakDay: peakEntry[1],
                        peakDayDate: peakEntry[0],
                        serviceCount: Object.keys(byService).length,
                    };
                })
            );

            setData(results);
            setSelectedIds(results.map((r) => r.project.id));
        } catch (err) {
            addToast("error", "Failed to load comparison data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [rangePreset]);

    useEffect(() => { load(); }, [load]);

    const filtered = data.filter((d) => selectedIds.includes(d.project.id));
    const grandTotal = filtered.reduce((s, d) => s + d.totalSpend, 0);
    const allAvgDaily = filtered.length > 0 ? grandTotal / (filtered.reduce((s, d) => s + Object.keys(d.dailyCosts).length, 0) / filtered.length || 1) : 0;

    // Build unified date range for trend chart
    const allDates = new Set<string>();
    filtered.forEach((d) => Object.keys(d.dailyCosts).forEach((dt) => allDates.add(dt)));
    const sortedDates = [...allDates].sort();

    // Find the highest spender
    const highestSpender = filtered.reduce((best, d) => d.totalSpend > (best?.totalSpend ?? 0) ? d : best, filtered[0]);

    // Cross-project service comparison
    const allServices = new Set<string>();
    filtered.forEach((d) => Object.keys(d.byService).forEach((s) => allServices.add(s)));
    const serviceList = [...allServices].sort((a, b) => {
        const totalA = filtered.reduce((s, d) => s + (d.byService[a] || 0), 0);
        const totalB = filtered.reduce((s, d) => s + (d.byService[b] || 0), 0);
        return totalB - totalA;
    });

    // Project colors
    const PROJECT_COLORS = [
        { bar: "from-indigo-500 to-violet-500", dot: "bg-indigo-500", text: "text-indigo-400", light: "bg-indigo-500/10", border: "border-indigo-500/30", hex: "#6366f1", ring: "ring-indigo-500/20" },
        { bar: "from-emerald-500 to-teal-500", dot: "bg-emerald-500", text: "text-emerald-400", light: "bg-emerald-500/10", border: "border-emerald-500/30", hex: "#10b981", ring: "ring-emerald-500/20" },
        { bar: "from-amber-500 to-orange-500", dot: "bg-amber-500", text: "text-amber-400", light: "bg-amber-500/10", border: "border-amber-500/30", hex: "#f59e0b", ring: "ring-amber-500/20" },
        { bar: "from-rose-500 to-pink-500", dot: "bg-rose-500", text: "text-rose-400", light: "bg-rose-500/10", border: "border-rose-500/30", hex: "#f43f5e", ring: "ring-rose-500/20" },
        { bar: "from-cyan-500 to-blue-500", dot: "bg-cyan-500", text: "text-cyan-400", light: "bg-cyan-500/10", border: "border-cyan-500/30", hex: "#06b6d4", ring: "ring-cyan-500/20" },
    ];

    function getColor(i: number) {
        return PROJECT_COLORS[i % PROJECT_COLORS.length];
    }

    function getProjectColor(projectId: string) {
        const idx = allProjects.findIndex((p) => p.id === projectId);
        return getColor(idx >= 0 ? idx : 0);
    }

    const rangeLabelMap: Record<RangePreset, string> = {
        "7d": "Last 7 Days",
        "14d": "Last 14 Days",
        "30d": "Last 30 Days",
        "90d": "Last 90 Days",
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto space-y-4 p-2">
                <div className="h-8 w-64 animate-shimmer rounded-lg bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 animate-shimmer rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]" />
                    ))}
                </div>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-48 animate-shimmer rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]" />
                ))}
            </div>
        );
    }

    if (allProjects.length < 2) {
        return (
            <div className="max-w-6xl mx-auto p-2">
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
        <div className="max-w-6xl mx-auto space-y-6 p-2">
            {/* ─── Header ─── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Compare Projects</h1>
                    <p className="mt-1 text-sm text-slate-400">Side-by-side cost comparison across your projects</p>
                </div>
                {/* Date range selector */}
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
                </div>
            </div>

            {/* ─── Project Selector Chips ─── */}
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
                    {/* ─── Overview Stats ─── */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            label="Total Period Spend"
                            value={`$${grandTotal.toFixed(2)}`}
                            sub={`${rangeLabelMap[rangePreset]} · ${filtered.length} project${filtered.length > 1 ? "s" : ""}`}
                            accent="indigo"
                            icon={
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                        />
                        <StatCard
                            label="Avg Daily Spend"
                            value={`$${(grandTotal / (sortedDates.length || 1)).toFixed(2)}`}
                            sub="Combined average per day"
                            accent="violet"
                            icon={
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                                </svg>
                            }
                        />
                        <StatCard
                            label="Peak Day Spend"
                            value={`$${Math.max(...filtered.map(d => d.peakDay), 0).toFixed(2)}`}
                            sub={(() => {
                                const peak = filtered.reduce((b, d) => d.peakDay > b.peakDay ? d : b, filtered[0]);
                                return peak?.peakDayDate ? `${peak.project.name} · ${new Date(peak.peakDayDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No data";
                            })()}
                            accent="amber"
                            icon={
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                                </svg>
                            }
                        />
                        <StatCard
                            label="Highest Spender"
                            value={highestSpender?.project.name ?? "—"}
                            sub={highestSpender ? `$${highestSpender.totalSpend.toFixed(2)} total` : "No data"}
                            accent="emerald"
                            icon={
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.996.178-1.768-.767-1.768-1.768 0-1.018.82-1.84 1.838-1.84h13.36c1.017 0 1.838.822 1.838 1.84 0 1-.772 1.946-1.768 1.768" />
                                </svg>
                            }
                        />
                    </div>

                    {/* ─── Cost Distribution Ring ─── */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                            <h2 className="text-lg font-semibold text-white mb-1">Cost Distribution</h2>
                            <p className="text-xs text-slate-500 mb-5">Share of total spend per project</p>
                            <div className="flex items-center gap-8">
                                {/* SVG ring chart */}
                                <div className="relative w-40 h-40 flex-shrink-0">
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                        {(() => {
                                            let offset = 0;
                                            const total = grandTotal || 1;
                                            return filtered.map((d) => {
                                                const pct = (d.totalSpend / total) * 100;
                                                const dashArray = `${pct * 2.51327} ${251.327 - pct * 2.51327}`;
                                                const dashOffset = -offset * 2.51327;
                                                const color = getProjectColor(d.project.id);
                                                offset += pct;
                                                return (
                                                    <circle
                                                        key={d.project.id}
                                                        cx="50" cy="50" r="40"
                                                        fill="none"
                                                        stroke={color.hex}
                                                        strokeWidth="12"
                                                        strokeDasharray={dashArray}
                                                        strokeDashoffset={dashOffset}
                                                        strokeLinecap="round"
                                                        className="transition-all duration-700"
                                                    />
                                                );
                                            });
                                        })()}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <p className="text-xl font-bold text-white">${grandTotal.toFixed(0)}</p>
                                        <p className="text-[10px] text-slate-500">TOTAL</p>
                                    </div>
                                </div>
                                {/* Legend */}
                                <div className="flex-1 space-y-3">
                                    {filtered
                                        .sort((a, b) => b.totalSpend - a.totalSpend)
                                        .map((d) => {
                                            const color = getProjectColor(d.project.id);
                                            const pct = grandTotal > 0 ? (d.totalSpend / grandTotal) * 100 : 0;
                                            return (
                                                <div key={d.project.id} className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className={`h-3 w-3 rounded-full ${color.dot} flex-shrink-0`} />
                                                        <span className="text-sm text-white truncate">{d.project.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                        <span className="text-xs text-slate-400">{pct.toFixed(1)}%</span>
                                                        <span className="text-sm font-semibold text-white">${d.totalSpend.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>

                        {/* ─── Monthly Spend Bar Comparison ─── */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                            <h2 className="text-lg font-semibold text-white mb-1">Spend Comparison</h2>
                            <p className="text-xs text-slate-500 mb-5">{rangeLabelMap[rangePreset]} spend per project</p>
                            <div className="space-y-4">
                                {filtered
                                    .sort((a, b) => b.totalSpend - a.totalSpend)
                                    .map((d) => {
                                        const maxSpend = Math.max(...filtered.map(f => f.totalSpend), 1);
                                        const pct = grandTotal > 0 ? (d.totalSpend / grandTotal) * 100 : 0;
                                        const barW = maxSpend > 0 ? (d.totalSpend / maxSpend) * 100 : 0;
                                        const color = getProjectColor(d.project.id);
                                        return (
                                            <div key={d.project.id}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`h-3 w-3 rounded-full ${color.dot}`} />
                                                        <span className="text-sm font-medium text-white">{d.project.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                                                        <span className="text-sm font-bold text-white">${d.totalSpend.toFixed(2)}</span>
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
                    </div>

                    {/* ─── Daily Trend Comparison ─── */}
                    {sortedDates.length > 1 && (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                            <div className="flex items-center justify-between mb-1">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Daily Spend Trend</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">{rangeLabelMap[rangePreset]}, per project</p>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    {filtered.map((d) => {
                                        const color = getProjectColor(d.project.id);
                                        return (
                                            <div key={d.project.id} className="flex items-center gap-1.5">
                                                <div className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
                                                <span className="text-xs text-slate-400">{d.project.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Stacked bar chart */}
                            <div className="mt-5">
                                <div className="flex items-end gap-[2px]" style={{ height: "200px" }}>
                                    {sortedDates.map((date) => {
                                        const dayTotal = filtered.reduce((s, d) => s + (d.dailyCosts[date] || 0), 0);
                                        const maxDayTotal = Math.max(...sortedDates.map(dt => filtered.reduce((s, d) => s + (d.dailyCosts[dt] || 0), 0)), 1);
                                        const totalH = (dayTotal / maxDayTotal) * 100;

                                        return (
                                            <div
                                                key={date}
                                                className="group relative flex-1 flex flex-col justify-end h-full cursor-pointer"
                                                onMouseEnter={() => setHoveredBar({ projectId: "", date })}
                                                onMouseLeave={() => setHoveredBar(null)}
                                            >
                                                {filtered.map((d) => {
                                                    const val = d.dailyCosts[date] || 0;
                                                    const segmentH = dayTotal > 0 ? (val / dayTotal) * totalH : 0;
                                                    const color = getProjectColor(d.project.id);
                                                    return (
                                                        <div
                                                            key={d.project.id}
                                                            style={{ height: `${segmentH}%`, minHeight: val > 0 ? "2px" : "0" }}
                                                            className={`bg-gradient-to-t ${color.bar} first:rounded-t transition-all duration-300 opacity-90 group-hover:opacity-100`}
                                                        />
                                                    );
                                                })}
                                                {/* Tooltip */}
                                                {hoveredBar?.date === date && (
                                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full hidden group-hover:block rounded-xl bg-slate-800 px-4 py-3 text-xs text-white whitespace-nowrap shadow-2xl border border-slate-700 z-30">
                                                        <div className="font-semibold mb-1.5 text-slate-300">
                                                            {new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}
                                                        </div>
                                                        {filtered.map((d) => {
                                                            const val = d.dailyCosts[date] || 0;
                                                            const color = getProjectColor(d.project.id);
                                                            return (
                                                                <div key={d.project.id} className="flex items-center justify-between gap-4 py-0.5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className={`h-2 w-2 rounded-full ${color.dot}`} />
                                                                        <span className="text-slate-400">{d.project.name}</span>
                                                                    </div>
                                                                    <span className="font-semibold text-white">${val.toFixed(2)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="border-t border-slate-700 mt-1.5 pt-1.5 flex justify-between font-semibold">
                                                            <span className="text-slate-400">Total</span>
                                                            <span>${dayTotal.toFixed(2)}</span>
                                                        </div>
                                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-slate-800 border-b border-r border-slate-700" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* X-axis labels */}
                                <div className="flex justify-between mt-2">
                                    {sortedDates.filter((_, i) => {
                                        const interval = Math.max(Math.floor(sortedDates.length / 7), 1);
                                        return i === 0 || i === sortedDates.length - 1 || i % interval === 0;
                                    }).map((date) => (
                                        <span key={date} className="text-[9px] text-slate-500">
                                            {new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── Detailed Comparison Table ─── */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Detailed Comparison</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{rangeLabelMap[rangePreset]} metrics</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-800">
                                        <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">Metric</th>
                                        {filtered.map((d) => {
                                            const color = getProjectColor(d.project.id);
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
                                    <CompRow label="Total Period Spend" values={filtered.map((d) => d.totalSpend)} highlight />
                                    <CompRow label="Today's Spend" values={filtered.map((d) => {
                                        const today = new Date().toISOString().split("T")[0];
                                        return d.dailyCosts[today] || 0;
                                    })} />
                                    <CompRow label="Avg Daily Spend" values={filtered.map((d) => d.avgDaily)} />
                                    <CompRow label="Peak Day Spend" values={filtered.map((d) => d.peakDay)} />
                                    <CompRow
                                        label="Peak Day Date"
                                        values={filtered.map((d) => d.peakDayDate ? new Date(d.peakDayDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—")}
                                        isCurrency={false}
                                        isText
                                    />
                                    <CompRow label="Monthly Forecast" values={filtered.map((d) => Number(d.summary?.monthForecast ?? d.avgDaily * 30))} />
                                    <CompRow label="Services Used" values={filtered.map((d) => d.serviceCount)} isCurrency={false} />
                                    <CompRow label="Days with Data" values={filtered.map((d) => Object.keys(d.dailyCosts).length)} isCurrency={false} />
                                    <CompRow
                                        label="Cost Volatility"
                                        values={filtered.map((d) => {
                                            const vals = Object.values(d.dailyCosts);
                                            if (vals.length < 2) return "Low";
                                            const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
                                            const variance = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;
                                            const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
                                            if (cv > 0.5) return "High";
                                            if (cv > 0.25) return "Medium";
                                            return "Low";
                                        })}
                                        isCurrency={false}
                                        isText
                                    />
                                    {/* Totals row */}
                                    <tr className="border-t-2 border-slate-700 bg-slate-800/30">
                                        <td className="px-5 py-3 text-white font-semibold">Share of Total</td>
                                        {filtered.map((d) => (
                                            <td key={d.project.id} className="px-5 py-3 text-right">
                                                <span className="inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
                                                    {grandTotal > 0 ? ((d.totalSpend / grandTotal) * 100).toFixed(1) : "0.0"}%
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ─── Service Cost Comparison ─── */}
                    {serviceList.length > 0 && (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Service Cost Comparison</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Same services across projects</p>
                                </div>
                                <span className="text-xs text-slate-500">{serviceList.length} services</span>
                            </div>
                            <div className="space-y-5">
                                {serviceList.slice(0, 8).map((svc) => {
                                    const maxSvcSpend = Math.max(...filtered.map(d => d.byService[svc] || 0), 1);
                                    const totalSvcSpend = filtered.reduce((s, d) => s + (d.byService[svc] || 0), 0);
                                    return (
                                        <div key={svc}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-white">{svc}</span>
                                                <span className="text-xs text-slate-400">Total: ${totalSvcSpend.toFixed(2)}</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {filtered.map((d) => {
                                                    const val = d.byService[svc] || 0;
                                                    const barW = maxSvcSpend > 0 ? (val / maxSvcSpend) * 100 : 0;
                                                    const color = getProjectColor(d.project.id);
                                                    return (
                                                        <div key={d.project.id} className="flex items-center gap-3">
                                                            <span className="text-xs text-slate-400 w-16 truncate flex-shrink-0">{d.project.name}</span>
                                                            <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full bg-gradient-to-r ${color.bar} transition-all duration-500`}
                                                                    style={{ width: `${barW}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-semibold text-white w-16 text-right flex-shrink-0">${val.toFixed(2)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ─── Spending Insights ─── */}
                    {filtered.length >= 2 && grandTotal > 0 && (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                                </svg>
                                Spending Insights
                            </h2>
                            <p className="text-xs text-slate-500 mb-4">Auto-generated comparisons between your projects</p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {generateInsights(filtered, grandTotal, getProjectColor).map((insight, i) => (
                                    <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                                        <span className="mt-0.5 text-lg flex-shrink-0">{insight.emoji}</span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white">{insight.title}</p>
                                            <p className="mt-1 text-xs text-slate-400">{insight.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── Top Services Per Project ─── */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {filtered.map((d) => {
                            const color = getProjectColor(d.project.id);
                            const topSvc = Object.entries(d.byService).sort(([, a], [, b]) => b - a).slice(0, 6);
                            const maxSvc = topSvc.length > 0 ? topSvc[0][1] : 1;
                            return (
                                <div key={d.project.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-3 w-3 rounded-full ${color.dot}`} />
                                            <h3 className="text-sm font-semibold text-white">{d.project.name} — Top Services</h3>
                                        </div>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{d.serviceCount} total</span>
                                    </div>
                                    <div className="space-y-3">
                                        {topSvc.map(([svc, amt]) => {
                                            const pct = d.totalSpend > 0 ? (amt / d.totalSpend) * 100 : 0;
                                            return (
                                                <div key={svc}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-slate-300 truncate mr-3">{svc}</span>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className="text-[10px] text-slate-500">{pct.toFixed(1)}%</span>
                                                            <span className="text-xs font-semibold text-white">${amt.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full bg-gradient-to-r ${color.bar}`}
                                                            style={{ width: `${(amt / maxSvc) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
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

function StatCard({ label, value, sub, accent, icon }: {
    label: string; value: string; sub: string; accent: string; icon: React.ReactNode;
}) {
    const accentClasses: Record<string, string> = {
        indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/20",
        violet: "from-violet-500/20 to-violet-500/5 border-violet-500/20",
        emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20",
        amber: "from-amber-500/20 to-amber-500/5 border-amber-500/20",
    };
    const iconClasses: Record<string, string> = {
        indigo: "text-indigo-400",
        violet: "text-violet-400",
        emerald: "text-emerald-400",
        amber: "text-amber-400",
    };

    return (
        <div className={`rounded-2xl border bg-gradient-to-br p-5 ${accentClasses[accent] || accentClasses.indigo}`}>
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
                <span className={iconClasses[accent] || iconClasses.indigo}>{icon}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
        </div>
    );
}

function CompRow({ label, values, highlight, isCurrency = true, isText }: {
    label: string; values: (number | string)[]; highlight?: boolean; isCurrency?: boolean; isText?: boolean;
}) {
    const numericValues = values.filter((v): v is number => typeof v === "number");
    const max = numericValues.length > 0 ? Math.max(...numericValues, 0.01) : 0;
    const min = numericValues.length > 0 ? Math.min(...numericValues) : 0;

    return (
        <tr className={`border-b border-slate-800/50 ${highlight ? "bg-indigo-500/5" : ""}`}>
            <td className="px-5 py-3 text-slate-400 font-medium">{label}</td>
            {values.map((v, i) => {
                if (isText || typeof v === "string") {
                    const volatilityColors: Record<string, string> = {
                        "High": "text-red-400",
                        "Medium": "text-amber-400",
                        "Low": "text-emerald-400",
                    };
                    return (
                        <td key={i} className="px-5 py-3 text-right">
                            <span className={`font-medium ${volatilityColors[v as string] || "text-white"}`}>{v}</span>
                        </td>
                    );
                }
                const isMax = typeof v === "number" && v === max && numericValues.filter((x) => x === max).length === 1;
                const isMin = typeof v === "number" && v === min && numericValues.filter((x) => x === min).length === 1 && numericValues.length > 1;
                return (
                    <td key={i} className="px-5 py-3 text-right">
                        <span className={`font-semibold ${isMax ? "text-rose-400" : isMin ? "text-emerald-400" : "text-white"}`}>
                            {isCurrency ? `$${v.toFixed(2)}` : v}
                        </span>
                        {isMax && <span className="ml-1 text-[10px] text-rose-400">▲</span>}
                        {isMin && <span className="ml-1 text-[10px] text-emerald-400">▼</span>}
                    </td>
                );
            })}
        </tr>
    );
}

/* ── Insights Generator ──────────────────────────── */

function generateInsights(
    filtered: ProjectData[],
    grandTotal: number,
    getProjectColor: (id: string) => { hex: string; dot: string }
): { emoji: string; title: string; desc: string }[] {
    const insights: { emoji: string; title: string; desc: string }[] = [];

    if (filtered.length < 2) return insights;

    // Sort by total spend
    const sorted = [...filtered].sort((a, b) => b.totalSpend - a.totalSpend);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];

    // Spend ratio
    if (highest && lowest && lowest.totalSpend > 0) {
        const ratio = highest.totalSpend / lowest.totalSpend;
        if (ratio > 1.5) {
            insights.push({
                emoji: "💰",
                title: `${highest.project.name} spends ${ratio.toFixed(1)}x more`,
                desc: `$${highest.totalSpend.toFixed(2)} vs $${lowest.totalSpend.toFixed(2)} for ${lowest.project.name} in the selected period.`,
            });
        }
    }

    // Most Cost-Efficient per service
    const allServices = new Set<string>();
    filtered.forEach(d => Object.keys(d.byService).forEach(s => allServices.add(s)));
    const topService = [...allServices].sort((a, b) => {
        const totalA = filtered.reduce((s, d) => s + (d.byService[a] || 0), 0);
        const totalB = filtered.reduce((s, d) => s + (d.byService[b] || 0), 0);
        return totalB - totalA;
    })[0];

    if (topService) {
        const serviceSpends = filtered
            .map(d => ({ name: d.project.name, spend: d.byService[topService] || 0 }))
            .sort((a, b) => b.spend - a.spend);

        if (serviceSpends.length >= 2 && serviceSpends[0].spend > 0) {
            const diff = serviceSpends[0].spend - serviceSpends[serviceSpends.length - 1].spend;
            insights.push({
                emoji: "🔍",
                title: `${topService} varies by $${diff.toFixed(2)}`,
                desc: `${serviceSpends[0].name} ($${serviceSpends[0].spend.toFixed(2)}) vs ${serviceSpends[serviceSpends.length - 1].name} ($${serviceSpends[serviceSpends.length - 1].spend.toFixed(2)}).`,
            });
        }
    }

    // Volatility insight
    const volatilities = filtered.map(d => {
        const vals = Object.values(d.dailyCosts);
        if (vals.length < 2) return { name: d.project.name, cv: 0 };
        const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
        const variance = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;
        return { name: d.project.name, cv: mean > 0 ? Math.sqrt(variance) / mean : 0 };
    }).sort((a, b) => b.cv - a.cv);

    if (volatilities.length >= 2 && volatilities[0].cv > 0.2) {
        insights.push({
            emoji: "📊",
            title: `${volatilities[0].name} has most variable costs`,
            desc: `Daily costs fluctuate by ${(volatilities[0].cv * 100).toFixed(0)}% from average. ${volatilities[volatilities.length - 1].name} is most stable at ${(volatilities[volatilities.length - 1].cv * 100).toFixed(0)}%.`,
        });
    }

    // Service count comparison
    const serviceCounts = filtered.map(d => ({ name: d.project.name, count: d.serviceCount })).sort((a, b) => b.count - a.count);
    if (serviceCounts.length >= 2 && serviceCounts[0].count > serviceCounts[serviceCounts.length - 1].count) {
        insights.push({
            emoji: "🧩",
            title: `${serviceCounts[0].name} uses ${serviceCounts[0].count - serviceCounts[serviceCounts.length - 1].count} more services`,
            desc: `${serviceCounts[0].count} vs ${serviceCounts[serviceCounts.length - 1].count} services for ${serviceCounts[serviceCounts.length - 1].name}. More services may mean higher complexity.`,
        });
    }

    // Avg daily comparison
    const avgDailies = filtered.map(d => ({ name: d.project.name, avg: d.avgDaily })).sort((a, b) => b.avg - a.avg);
    if (avgDailies.length >= 2 && avgDailies[0].avg > 0) {
        insights.push({
            emoji: "📅",
            title: "Daily cost difference",
            desc: `${avgDailies[0].name} averages $${avgDailies[0].avg.toFixed(2)}/day while ${avgDailies[avgDailies.length - 1].name} averages $${avgDailies[avgDailies.length - 1].avg.toFixed(2)}/day.`,
        });
    }

    // Concentration warning
    const concentrated = filtered.find(d => {
        const topSvc = Object.entries(d.byService).sort(([, a], [, b]) => b - a)[0];
        return topSvc && d.totalSpend > 0 && (topSvc[1] / d.totalSpend) > 0.5;
    });
    if (concentrated) {
        const topSvc = Object.entries(concentrated.byService).sort(([, a], [, b]) => b - a)[0];
        const pct = (topSvc[1] / concentrated.totalSpend * 100).toFixed(0);
        insights.push({
            emoji: "⚠️",
            title: `High concentration in ${concentrated.project.name}`,
            desc: `${topSvc[0]} accounts for ${pct}% of total spend. Consider optimizing this service.`,
        });
    }

    return insights.slice(0, 6);
}
