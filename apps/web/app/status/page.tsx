"use client";

import { useEffect, useState, useCallback } from "react";

interface HealthData {
    status: string;
    uptime: number;
    version: string;
    timestamp: string;
    db: string;
}

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return [d > 0 ? `${d}d` : "", h > 0 ? `${h}h` : "", `${m}m`].filter(Boolean).join(" ");
}

export default function StatusPage() {
    const [health, setHealth] = useState<HealthData | null>(null);
    const [error, setError] = useState(false);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const [checking, setChecking] = useState(false);

    const check = useCallback(async () => {
        setChecking(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
            const res = await fetch(`${apiBase}/health`, { cache: "no-store" });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setHealth(data);
            setError(false);
        } catch {
            setHealth(null);
            setError(true);
        } finally {
            setChecking(false);
            setLastChecked(new Date());
        }
    }, []);

    useEffect(() => { check(); }, [check]);

    const isUp = health?.status === "ok";
    const dbUp = health?.db === "connected";

    return (
        <main className="min-h-screen bg-slate-950 p-6">
            <div className="mx-auto max-w-xl space-y-6 pt-16">
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                        <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">CloudPulse Status</h1>
                    <p className="mt-1 text-sm text-slate-400">Real-time system health</p>
                </div>

                {/* Overall status */}
                <div className={`rounded-2xl border p-6 text-center ${error ? "border-red-500/30 bg-red-950/20" : isUp ? "border-emerald-500/30 bg-emerald-950/20" : "border-slate-800 bg-slate-900/60"
                    }`}>
                    <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${error ? "bg-red-500/20" : isUp ? "bg-emerald-500/20" : "bg-slate-800"
                        }`}>
                        {checking ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                        ) : error ? (
                            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        )}
                    </div>
                    <h2 className={`text-xl font-bold ${error ? "text-red-400" : "text-emerald-400"}`}>
                        {error ? "Service Disruption" : "All Systems Operational"}
                    </h2>
                </div>

                {/* Services */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800">
                    <StatusRow label="API Server" status={isUp} />
                    <StatusRow label="Database" status={dbUp} />
                    <StatusRow label="Web Application" status={true} />
                </div>

                {/* Details */}
                {health && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                        <h3 className="text-sm font-semibold text-white mb-3">Details</h3>
                        <div className="space-y-2 text-sm">
                            <DetailRow label="Version" value={health.version} />
                            <DetailRow label="Uptime" value={formatUptime(health.uptime)} />
                            <DetailRow label="Server Time" value={new Date(health.timestamp).toLocaleString()} />
                        </div>
                    </div>
                )}

                {/* Refresh */}
                <div className="text-center space-y-2">
                    <button
                        onClick={check}
                        disabled={checking}
                        className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
                    >
                        {checking ? "Checking..." : "Refresh"}
                    </button>
                    {lastChecked && (
                        <p className="text-xs text-slate-600">Last checked: {lastChecked.toLocaleTimeString()}</p>
                    )}
                </div>
            </div>
        </main>
    );
}

function StatusRow({ label, status }: { label: string; status: boolean | undefined }) {
    return (
        <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-white">{label}</span>
            <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${status ? "text-emerald-400" : "text-red-400"}`}>
                    {status ? "Operational" : "Down"}
                </span>
                <div className={`h-2.5 w-2.5 rounded-full ${status ? "bg-emerald-400" : "bg-red-400"}`} />
            </div>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-slate-400">{label}</span>
            <span className="text-white font-mono text-xs">{value}</span>
        </div>
    );
}
