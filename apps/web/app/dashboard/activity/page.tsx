"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { getActivityLog, ActivityLogEntry } from "../../../lib/api";

const ACTION_META: Record<string, { icon: string; label: string; color: string }> = {
    PROJECT_CREATED: { icon: "📁", label: "Project Created", color: "text-emerald-400" },
    PROJECT_DELETED: { icon: "🗑️", label: "Project Deleted", color: "text-red-400" },
    ACCOUNT_ADDED: { icon: "☁️", label: "Account Added", color: "text-blue-400" },
    ACCOUNT_DELETED: { icon: "❌", label: "Account Removed", color: "text-red-400" },
    COST_FETCHED: { icon: "📊", label: "Cost Data Fetched", color: "text-indigo-400" },
    ALERT_TRIGGERED: { icon: "🔔", label: "Alert Triggered", color: "text-amber-400" },
    ALERT_CREATED: { icon: "➕", label: "Alert Rule Created", color: "text-emerald-400" },
    ALERT_DELETED: { icon: "🔕", label: "Alert Rule Deleted", color: "text-red-400" },
    PROFILE_UPDATED: { icon: "👤", label: "Profile Updated", color: "text-violet-400" },
    PASSWORD_CHANGED: { icon: "🔒", label: "Password Changed", color: "text-amber-400" },
    LOGIN: { icon: "🚀", label: "Logged In", color: "text-indigo-400" },
};

function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ActivityPage() {

    const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("ALL");

    const load = useCallback(async () => {

        setLoading(true);
        try {
            const data = await getActivityLog(100);
            setLogs(data);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = filter === "ALL" ? logs : logs.filter((l) => l.action === filter);
    const uniqueActions = [...new Set(logs.map((l) => l.action))];

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto space-y-4">
                <div className="h-8 w-48 animate-shimmer rounded-lg bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]" />
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 animate-shimmer rounded-xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]" />
                ))}
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Activity Log</h1>
                <p className="mt-1 text-sm text-slate-400">Recent actions across your account</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setFilter("ALL")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === "ALL"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 bg-slate-800 hover:text-white"
                        }`}
                >
                    All ({logs.length})
                </button>
                {uniqueActions.map((action) => {
                    const meta = ACTION_META[action] || { label: action, icon: "📋", color: "text-slate-400" };
                    const count = logs.filter((l) => l.action === action).length;
                    return (
                        <button
                            key={action}
                            onClick={() => setFilter(action)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === action
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "text-slate-400 bg-slate-800 hover:text-white"
                                }`}
                        >
                            {meta.icon} {meta.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Timeline */}
            {filtered.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
                    <p className="text-slate-400">No activity recorded yet. Start by creating a project.</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {filtered.map((log) => {
                        const meta = ACTION_META[log.action] || { icon: "📋", label: log.action, color: "text-slate-400" };
                        const details = log.details as Record<string, string>;
                        return (
                            <div
                                key={log.id}
                                className="flex items-start gap-4 rounded-xl border border-slate-800/50 bg-slate-900/40 px-4 py-3 transition hover:bg-slate-900/70"
                            >
                                <span className="mt-0.5 text-lg shrink-0">{meta.icon}</span>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-medium ${meta.color}`}>{meta.label}</p>
                                    {details && Object.keys(details).length > 0 && (
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                                            {Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                                        </p>
                                    )}
                                </div>
                                <span className="text-xs text-slate-600 shrink-0 mt-0.5">{relativeTime(log.createdAt)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
