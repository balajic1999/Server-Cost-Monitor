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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        Promise.all([
            getProjectCostSummary(token, projectId).catch(() => null),
            // Get records from all cloud accounts
        ])
            .then(([s]) => {
                if (s) setSummary(s);
            })
            .finally(() => setLoading(false));
    }, [token, projectId]);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="space-y-6">
            {/* Stats grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    label="Today's Spend"
                    value={`$${(summary?.todaySpend ?? 0).toFixed(2)}`}
                    accent="indigo"
                    icon={
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <StatCard
                    label="This Month"
                    value={`$${(summary?.monthSpend ?? 0).toFixed(2)}`}
                    accent="violet"
                    icon={
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                    }
                />
                <StatCard
                    label="Monthly Forecast"
                    value={`$${(summary?.monthForecast ?? 0).toFixed(2)}`}
                    accent="emerald"
                    icon={
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                        </svg>
                    }
                />
            </div>

            {/* Cost chart placeholder with gradient background */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Cost Trend (Last 30 Days)</h3>
                {summary && (summary.monthSpend > 0) ? (
                    <CostBarChart records={records} />
                ) : (
                    <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-700">
                        <div className="text-center">
                            <svg className="mx-auto h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                            </svg>
                            <p className="mt-2 text-sm text-slate-500">Connect a cloud account and fetch costs to see data here</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function CostBarChart({ records }: { records: CostRecord[] }) {
    // Group by date and aggregate
    const byDate = records.reduce<Record<string, number>>((acc, r) => {
        const date = r.periodStart.split("T")[0];
        acc[date] = (acc[date] ?? 0) + r.amount;
        return acc;
    }, {});

    const entries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
    const maxVal = Math.max(...entries.map(([, v]) => v), 1);

    return (
        <div className="flex items-end gap-1 h-48">
            {entries.map(([date, amount]) => (
                <div key={date} className="group relative flex-1 flex flex-col justify-end">
                    <div
                        className="rounded-t bg-gradient-to-t from-indigo-500 to-violet-500 transition-all hover:from-indigo-400 hover:to-violet-400"
                        style={{ height: `${(amount / maxVal) * 100}%`, minHeight: "2px" }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block rounded bg-slate-800 px-2 py-1 text-xs text-white whitespace-nowrap shadow-lg border border-slate-700 z-10">
                        ${amount.toFixed(2)} · {date}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ─── Cloud Accounts Tab ───────────────────────────────── */

function AccountsTab({ projectId }: { projectId: string }) {
    const { token } = useAuth();
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
        } catch { }
    }

    async function handleFetch(accountId: string) {
        if (!token) return;
        setFetching(accountId);
        try {
            const today = new Date();
            const endDate = today.toISOString().split("T")[0];
            const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
            const result = await fetchCosts(token, accountId, startDate, endDate);
            alert(`Fetched ${result.recordsUpserted} cost records!`);
        } catch (err) {
            alert((err as Error).message);
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
        } catch { }
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
                                            {rule.emailEnabled && <span>📧 Email alerts</span>}
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

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/30" />
                        <span className="text-sm text-slate-300">Send email notifications</span>
                    </label>

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

function StatCard({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: ReactNode }) {
    const colors: Record<string, string> = {
        indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-400",
        violet: "from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400",
        emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
        amber: "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400",
    };

    return (
        <div className={`rounded-xl border bg-gradient-to-br p-5 ${colors[accent] || colors.indigo}`}>
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
                {icon}
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{value}</p>
        </div>
    );
}

function LoadingSpinner() {
    return (
        <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
    );
}
