"use client";

import { useEffect, useState, FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import {
    listProjects, createProject, deleteProject, Project,
    getProjectCostSummary, CostSummary,
} from "../../lib/api";
import Link from "next/link";

export default function DashboardPage() {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [summaries, setSummaries] = useState<Record<string, CostSummary>>({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (!token) return;
        listProjects(token)
            .then(async (projs) => {
                setProjects(projs);
                // Fetch cost summaries for all projects in parallel
                const entries = await Promise.all(
                    projs.map(async (p) => {
                        try {
                            const s = await getProjectCostSummary(token, p.id);
                            return [p.id, s] as const;
                        } catch {
                            return [p.id, null] as const;
                        }
                    })
                );
                const map: Record<string, CostSummary> = {};
                for (const [id, s] of entries) {
                    if (s) map[id] = s;
                }
                setSummaries(map);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [token]);

    async function handleDelete(id: string) {
        if (!token || !confirm("Delete this project? All data will be lost.")) return;
        try {
            await deleteProject(token, id);
            setProjects((p) => p.filter((x) => x.id !== id));
            addToast("success", "Project deleted");
        } catch (err) {
            addToast("error", (err as Error).message);
        }
    }

    // Cross-project totals
    const totalToday = Object.values(summaries).reduce((s, v) => s + Number(v.todaySpend ?? 0), 0);
    const totalMonth = Object.values(summaries).reduce((s, v) => s + Number(v.monthSpend ?? 0), 0);
    const totalForecast = Object.values(summaries).reduce((s, v) => s + Number(v.monthForecast ?? 0), 0);
    const totalAccounts = projects.reduce((s, p) => s + p.cloudAccounts.length, 0);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-5">
                            <div className="h-3 w-20 rounded animate-shimmer" />
                            <div className="mt-3 h-7 w-24 rounded animate-shimmer" />
                        </div>
                    ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-2xl border border-slate-800/50 bg-slate-900/30 p-6 h-40 animate-shimmer" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Welcome + action */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        {projects.length} project{projects.length !== 1 ? "s" : ""} · {totalAccounts} cloud account{totalAccounts !== 1 ? "s" : ""}
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New Project
                </button>
            </div>

            {/* Cross-project overview stats */}
            {projects.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <OverviewCard
                        label="Today's Total"
                        value={`$${totalToday.toFixed(2)}`}
                        color="from-indigo-500/20 to-indigo-500/5 border-indigo-500/20"
                        icon={
                            <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <OverviewCard
                        label="This Month (All)"
                        value={`$${totalMonth.toFixed(2)}`}
                        color="from-violet-500/20 to-violet-500/5 border-violet-500/20"
                        icon={
                            <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                            </svg>
                        }
                    />
                    <OverviewCard
                        label="Forecast (All)"
                        value={`$${totalForecast.toFixed(2)}`}
                        color="from-emerald-500/20 to-emerald-500/5 border-emerald-500/20"
                        icon={
                            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                            </svg>
                        }
                    />
                    <OverviewCard
                        label="Projects"
                        value={`${projects.length}`}
                        subtitle={`${totalAccounts} account${totalAccounts !== 1 ? "s" : ""} connected`}
                        color="from-amber-500/20 to-amber-500/5 border-amber-500/20"
                        icon={
                            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                            </svg>
                        }
                    />
                </div>
            )}

            {/* Projects section */}
            <div>
                <h2 className="mb-4 text-lg font-semibold text-white">Your Projects</h2>
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 py-20">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800">
                            <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                            </svg>
                        </div>
                        <p className="text-lg font-medium text-white">No projects yet</p>
                        <p className="mt-1 text-sm text-slate-400">Create your first project to start monitoring costs</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                        >
                            Create Project
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {projects.map((p) => {
                            const s = summaries[p.id];
                            const monthSpend = Number(s?.monthSpend ?? 0);
                            const forecast = Number(s?.monthForecast ?? 0);
                            const todaySpend = Number(s?.todaySpend ?? 0);

                            return (
                                <div key={p.id} className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700 hover:bg-slate-900">
                                    <Link href={`/dashboard/projects/${p.id}`} className="absolute inset-0 z-10" />

                                    <div className="mb-4 flex items-start justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-400">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                            </svg>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                                            className="relative z-20 rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-red-950/50 hover:text-red-400 group-hover:opacity-100"
                                            title="Delete project"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>

                                    <h3 className="text-lg font-semibold text-white">{p.name}</h3>

                                    {/* Cost preview */}
                                    {s ? (
                                        <div className="mt-3 grid grid-cols-3 gap-2">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-slate-500">Today</p>
                                                <p className="text-sm font-semibold text-white">${todaySpend.toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-slate-500">Month</p>
                                                <p className="text-sm font-semibold text-white">${monthSpend.toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-slate-500">Forecast</p>
                                                <p className="text-sm font-semibold text-white">${forecast.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-xs text-slate-600">No cost data yet</p>
                                    )}

                                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <span className={`inline-block h-2 w-2 rounded-full ${p.cloudAccounts.length > 0 ? "bg-emerald-500" : "bg-slate-600"}`} />
                                            {p.cloudAccounts.length} account{p.cloudAccounts.length !== 1 ? "s" : ""}
                                        </span>
                                        <span>{p._count.alertRules} alert{p._count.alertRules !== 1 ? "s" : ""}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Quick Tips */}
            {projects.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                    <h3 className="mb-4 text-lg font-semibold text-white flex items-center gap-2">
                        <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                        </svg>
                        Cost Optimization Tips
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {getCostTips(totalMonth, totalForecast, totalToday, projects.length).map((tip, i) => (
                            <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                                <span className="mt-0.5 text-lg">{tip.emoji}</span>
                                <div>
                                    <p className="text-sm font-medium text-white">{tip.title}</p>
                                    <p className="mt-1 text-xs text-slate-400">{tip.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create modal */}
            {showModal && (
                <CreateProjectModal
                    onClose={() => setShowModal(false)}
                    onCreated={(p) => {
                        setProjects((prev) => [p, ...prev]);
                        setShowModal(false);
                        addToast("success", `Project "${p.name}" created!`);
                    }}
                />
            )}
        </div>
    );
}

/* ─── Cost Tips Engine ───────────────────────────────────── */

function getCostTips(monthTotal: number, forecast: number, todaySpend: number, projectCount: number) {
    const tips: { emoji: string; title: string; desc: string }[] = [];

    if (forecast > monthTotal * 1.3 && monthTotal > 0) {
        tips.push({
            emoji: "📈",
            title: "Rising Forecast",
            desc: `Your forecast ($${forecast.toFixed(0)}) is ${((forecast / monthTotal - 1) * 100).toFixed(0)}% above current month spend. Consider setting budget alerts.`,
        });
    }

    if (todaySpend > (monthTotal / new Date().getDate()) * 1.5 && todaySpend > 0) {
        tips.push({
            emoji: "⚠️",
            title: "Today's Spend Spike",
            desc: "Today's spend is significantly above your daily average. Check for unexpected resource usage.",
        });
    }

    tips.push({
        emoji: "🔔",
        title: "Set Budget Alerts",
        desc: "Create alert rules on your projects to get notified via email or Slack when budgets are exceeded.",
    });

    if (projectCount > 1) {
        tips.push({
            emoji: "📊",
            title: "Compare Projects",
            desc: "Review per-project spend to identify which workloads consume the most resources.",
        });
    }

    tips.push({
        emoji: "📥",
        title: "Export Reports",
        desc: "Use CSV export on the overview tab to share cost reports with your finance team.",
    });

    tips.push({
        emoji: "💡",
        title: "Review Idle Resources",
        desc: "Check for services with low usage but high costs — unused EC2 instances, idle RDS databases, or unattached EBS volumes.",
    });

    return tips.slice(0, 3);
}

/* ─── Overview Card ──────────────────────────────────────── */

function OverviewCard({ label, value, color, icon, subtitle }: {
    label: string; value: string; color: string; icon: React.ReactNode; subtitle?: string;
}) {
    return (
        <div className={`rounded-xl border bg-gradient-to-br p-5 ${color}`}>
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
                {icon}
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
    );
}

/* ─── Create Project Modal ───────────────────────────────── */

function CreateProjectModal({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: (p: Project) => void;
}) {
    const { token } = useAuth();
    const [name, setName] = useState("");
    const [timezone, setTimezone] = useState("UTC");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!token) return;
        setError("");
        setLoading(true);
        try {
            const project = await createProject(token, { name, timezone });
            onCreated(project);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-white">New Project</h2>
                <p className="mt-1 text-sm text-slate-400">Set up a new cloud cost monitoring project</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {error && (
                        <div className="rounded-lg border border-red-800/50 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="project-name" className="mb-1.5 block text-sm font-medium text-slate-300">Project Name</label>
                        <input
                            id="project-name"
                            type="text"
                            required
                            minLength={2}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            placeholder="e.g. Production AWS"
                        />
                    </div>

                    <div>
                        <label htmlFor="timezone" className="mb-1.5 block text-sm font-medium text-slate-300">Timezone</label>
                        <select
                            id="timezone"
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        >
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">US Eastern</option>
                            <option value="America/Chicago">US Central</option>
                            <option value="America/Denver">US Mountain</option>
                            <option value="America/Los_Angeles">US Pacific</option>
                            <option value="Europe/London">London</option>
                            <option value="Europe/Berlin">Berlin</option>
                            <option value="Asia/Kolkata">India (IST)</option>
                            <option value="Asia/Tokyo">Tokyo</option>
                            <option value="Asia/Shanghai">Shanghai</option>
                            <option value="Australia/Sydney">Sydney</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
                        >
                            {loading ? "Creating…" : "Create Project"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
