"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import {
    listCloudAccounts,
    getCostRecords,
    CloudAccount,
    CostRecord,
} from "../../../../lib/api";

interface AccountCost {
    account: CloudAccount;
    records: CostRecord[];
    totalSpend: number;
    todaySpend: number;
    monthSpend: number;
    byService: Record<string, number>;
    dailyCosts: Record<string, number>;
}

interface ProviderSummary {
    provider: string;
    accounts: AccountCost[];
    totalSpend: number;
    todaySpend: number;
    monthSpend: number;
    serviceCount: number;
    color: { bg: string; text: string; gradient: string; icon: string; dot: string; light: string; border: string };
}

const PROVIDER_STYLES: Record<string, { bg: string; text: string; gradient: string; icon: string; dot: string; light: string; border: string }> = {
    AWS: { bg: "from-amber-500/20 to-orange-500/20", text: "text-amber-400", gradient: "from-amber-500 to-orange-500", icon: "☁️", dot: "bg-amber-400", light: "bg-amber-500/10", border: "border-amber-500/30" },
    GCP: { bg: "from-blue-500/20 to-green-500/20", text: "text-blue-400", gradient: "from-blue-500 to-cyan-500", icon: "🔵", dot: "bg-blue-400", light: "bg-blue-500/10", border: "border-blue-500/30" },
    AZURE: { bg: "from-cyan-500/20 to-blue-500/20", text: "text-cyan-400", gradient: "from-cyan-500 to-blue-500", icon: "🔷", dot: "bg-cyan-400", light: "bg-cyan-500/10", border: "border-cyan-500/30" },
};

function getProviderStyle(provider: string) {
    return PROVIDER_STYLES[provider] || PROVIDER_STYLES.AWS;
}

function getProviderLabel(provider: string) {
    return provider === "GCP" ? "Google Cloud" : provider === "AZURE" ? "Microsoft Azure" : "Amazon Web Services";
}

export default function ComparisonTab({ projectId }: { projectId: string }) {

    const [data, setData] = useState<AccountCost[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {

        setLoading(true);
        try {
            const accounts = await listCloudAccounts(projectId);
            const today = new Date().toISOString().split("T")[0];
            const monthStart = today.slice(0, 7) + "-01";
            const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

            const results: AccountCost[] = await Promise.all(
                accounts.map(async (account) => {
                    const records = await getCostRecords(account.id, thirtyDaysAgo);
                    const totalSpend = records.reduce((s, r) => s + Number(r.amount), 0);
                    const todaySpend = records
                        .filter((r) => r.periodStart.startsWith(today))
                        .reduce((s, r) => s + Number(r.amount), 0);
                    const monthSpend = records
                        .filter((r) => r.periodStart >= monthStart)
                        .reduce((s, r) => s + Number(r.amount), 0);
                    const byService: Record<string, number> = {};
                    const dailyCosts: Record<string, number> = {};
                    records.forEach((r) => {
                        byService[r.serviceName] = (byService[r.serviceName] || 0) + Number(r.amount);
                        const date = r.periodStart.split("T")[0];
                        dailyCosts[date] = (dailyCosts[date] || 0) + Number(r.amount);
                    });
                    return { account, records, totalSpend, todaySpend, monthSpend, byService, dailyCosts };
                })
            );

            setData(results.sort((a, b) => b.totalSpend - a.totalSpend));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 animate-shimmer rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]" />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
                <p className="text-slate-400">No cloud accounts to compare. Add accounts from multiple providers to see multi-cloud comparison.</p>
            </div>
        );
    }

    const grandTotal = data.reduce((s, d) => s + d.totalSpend, 0);
    const maxSpend = Math.max(...data.map((d) => d.totalSpend), 1);

    // Group by provider for multi-cloud view
    const providers = new Set(data.map((d) => d.account.provider));
    const providerSummaries: ProviderSummary[] = [...providers].map((provider) => {
        const accounts = data.filter((d) => d.account.provider === provider);
        const totalSpend = accounts.reduce((s, a) => s + a.totalSpend, 0);
        const todaySpend = accounts.reduce((s, a) => s + a.todaySpend, 0);
        const monthSpend = accounts.reduce((s, a) => s + a.monthSpend, 0);
        const allServices = new Set<string>();
        accounts.forEach((a) => Object.keys(a.byService).forEach((s) => allServices.add(s)));
        return {
            provider,
            accounts,
            totalSpend,
            todaySpend,
            monthSpend,
            serviceCount: allServices.size,
            color: getProviderStyle(provider),
        };
    }).sort((a, b) => b.totalSpend - a.totalSpend);

    const isMultiCloud = providers.size > 1;

    // Unified daily cost data across providers
    const allDates = new Set<string>();
    data.forEach((d) => Object.keys(d.dailyCosts).forEach((dt) => allDates.add(dt)));
    const sortedDates = [...allDates].sort();

    return (
        <div className="space-y-6">
            {/* ─── Multi-Cloud Provider Summary ─── */}
            {isMultiCloud && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                    <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                        <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                        </svg>
                        Multi-Cloud Cost Breakdown
                    </h3>
                    <p className="text-xs text-slate-500 mb-5">
                        Spending across {providers.size} cloud providers · Total: <span className="text-white font-semibold">${grandTotal.toFixed(2)}</span>
                    </p>

                    {/* Provider cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                        {providerSummaries.map((ps) => {
                            const pct = grandTotal > 0 ? (ps.totalSpend / grandTotal) * 100 : 0;
                            return (
                                <div key={ps.provider} className={`rounded-xl border ${ps.color.border} bg-gradient-to-br ${ps.color.bg} p-5`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{ps.color.icon}</span>
                                            <span className={`text-sm font-semibold ${ps.color.text}`}>{ps.provider}</span>
                                        </div>
                                        <span className={`inline-flex items-center rounded-full ${ps.color.light} px-2 py-0.5 text-xs font-medium ${ps.color.text}`}>
                                            {pct.toFixed(1)}%
                                        </span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">${ps.totalSpend.toFixed(2)}</p>
                                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                                        <span>Today: ${ps.todaySpend.toFixed(2)}</span>
                                        <span>Month: ${ps.monthSpend.toFixed(2)}</span>
                                    </div>
                                    <div className="mt-2 text-[10px] text-slate-500">
                                        {ps.accounts.length} account{ps.accounts.length !== 1 ? "s" : ""} · {ps.serviceCount} service{ps.serviceCount !== 1 ? "s" : ""}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Provider spend distribution bar */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-300">Provider Spend Distribution</h4>
                        <div className="flex h-5 rounded-full overflow-hidden bg-slate-800">
                            {providerSummaries.map((ps) => {
                                const width = grandTotal > 0 ? (ps.totalSpend / grandTotal) * 100 : 0;
                                return (
                                    <div
                                        key={ps.provider}
                                        className={`h-full bg-gradient-to-r ${ps.color.gradient} transition-all duration-700 first:rounded-l-full last:rounded-r-full`}
                                        style={{ width: `${width}%` }}
                                        title={`${ps.provider}: $${ps.totalSpend.toFixed(2)} (${width.toFixed(1)}%)`}
                                    />
                                );
                            })}
                        </div>
                        <div className="flex gap-4">
                            {providerSummaries.map((ps) => (
                                <div key={ps.provider} className="flex items-center gap-1.5">
                                    <div className={`h-2.5 w-2.5 rounded-full ${ps.color.dot}`} />
                                    <span className="text-xs text-slate-400">{ps.provider}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Provider Daily Trend (Multi-Cloud) ─── */}
            {isMultiCloud && sortedDates.length > 1 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Provider Daily Trend</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Last 30 days, stacked by provider</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {providerSummaries.map((ps) => (
                                <div key={ps.provider} className="flex items-center gap-1.5">
                                    <div className={`h-2.5 w-2.5 rounded-full ${ps.color.dot}`} />
                                    <span className="text-xs text-slate-400">{ps.provider}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5">
                        <div className="flex items-end gap-[2px]" style={{ height: "180px" }}>
                            {sortedDates.map((date) => {
                                const dayTotal = data.reduce((s, d) => s + (d.dailyCosts[date] || 0), 0);
                                const maxDayTotal = Math.max(...sortedDates.map(dt => data.reduce((s, d) => s + (d.dailyCosts[dt] || 0), 0)), 1);
                                const totalH = (dayTotal / maxDayTotal) * 100;

                                return (
                                    <div key={date} className="group relative flex-1 flex flex-col justify-end h-full cursor-pointer">
                                        {providerSummaries.map((ps) => {
                                            const provAccounts = data.filter(d => d.account.provider === ps.provider);
                                            const val = provAccounts.reduce((s, d) => s + (d.dailyCosts[date] || 0), 0);
                                            const segmentH = dayTotal > 0 ? (val / dayTotal) * totalH : 0;
                                            return (
                                                <div
                                                    key={ps.provider}
                                                    style={{ height: `${segmentH}%`, minHeight: val > 0 ? "2px" : "0" }}
                                                    className={`bg-gradient-to-t ${ps.color.gradient} first:rounded-t transition-all duration-300 opacity-90 group-hover:opacity-100`}
                                                />
                                            );
                                        })}
                                        {/* Tooltip */}
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full hidden group-hover:block rounded-xl bg-slate-800 px-4 py-3 text-xs text-white whitespace-nowrap shadow-2xl border border-slate-700 z-30">
                                            <div className="font-semibold mb-1.5 text-slate-300">
                                                {new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}
                                            </div>
                                            {providerSummaries.map((ps) => {
                                                const provAccounts = data.filter(d => d.account.provider === ps.provider);
                                                const val = provAccounts.reduce((s, d) => s + (d.dailyCosts[date] || 0), 0);
                                                return (
                                                    <div key={ps.provider} className="flex items-center justify-between gap-4 py-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`h-2 w-2 rounded-full ${ps.color.dot}`} />
                                                            <span className="text-slate-400">{ps.provider}</span>
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
                                    </div>
                                );
                            })}
                        </div>

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

            {/* ─── Account-Level Comparison ─── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                    </svg>
                    Account Comparison — Last 30 Days
                </h3>
                <p className="text-sm text-slate-400 mb-5">
                    Total across {data.length} account{data.length !== 1 ? "s" : ""}: <span className="text-white font-semibold">${grandTotal.toFixed(2)}</span>
                </p>

                {/* Bar chart */}
                <div className="space-y-3">
                    {data.map((d) => {
                        const pct = grandTotal > 0 ? (d.totalSpend / grandTotal) * 100 : 0;
                        const barWidth = maxSpend > 0 ? (d.totalSpend / maxSpend) * 100 : 0;
                        const style = getProviderStyle(d.account.provider);

                        return (
                            <div key={d.account.id}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`h-2.5 w-2.5 rounded-full ${style.dot} flex-shrink-0`} />
                                        <span className="text-xs font-medium text-white truncate">{d.account.accountLabel}</span>
                                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${style.light} ${style.text} ${style.border} border`}>
                                            {d.account.provider}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">{d.account.externalAccountId}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400">{pct.toFixed(1)}%</span>
                                        <span className="text-sm font-bold text-white">${d.totalSpend.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full bg-gradient-to-r ${style.gradient} transition-all duration-500`}
                                        style={{ width: `${barWidth}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Detailed Table with Provider Badges ─── */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <div className="p-4 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-white">Detailed Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-800 text-left">
                                <th className="px-4 py-3 text-xs text-slate-500 font-medium">Account</th>
                                <th className="px-4 py-3 text-xs text-slate-500 font-medium">Provider</th>
                                <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Today</th>
                                <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">This Month</th>
                                <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">30-Day Total</th>
                                <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((d) => {
                                const style = getProviderStyle(d.account.provider);
                                return (
                                    <tr key={d.account.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-white">{d.account.accountLabel}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">{d.account.externalAccountId}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.light} ${style.text} border ${style.border}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                                                {d.account.provider}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-white">${d.todaySpend.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right text-white">${d.monthSpend.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-white">${d.totalSpend.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-400">
                                                {grandTotal > 0 ? ((d.totalSpend / grandTotal) * 100).toFixed(1) : "0.0"}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {/* Provider subtotals */}
                            {isMultiCloud && providerSummaries.map((ps) => (
                                <tr key={`subtotal-${ps.provider}`} className="border-b border-slate-700 bg-slate-800/20">
                                    <td className="px-4 py-2 text-xs font-semibold text-slate-400" colSpan={2}>
                                        <span className="flex items-center gap-1.5">
                                            <span className={`h-2 w-2 rounded-full ${ps.color.dot}`} />
                                            {ps.provider} Subtotal ({ps.accounts.length} account{ps.accounts.length !== 1 ? "s" : ""})
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right text-xs font-semibold text-slate-300">${ps.todaySpend.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right text-xs font-semibold text-slate-300">${ps.monthSpend.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right text-xs font-bold text-white">${ps.totalSpend.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right">
                                        <span className={`inline-flex items-center rounded-full ${ps.color.light} border ${ps.color.border} px-2 py-0.5 text-xs font-medium ${ps.color.text}`}>
                                            {grandTotal > 0 ? ((ps.totalSpend / grandTotal) * 100).toFixed(1) : "0.0"}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Cross-Provider Service Comparison ─── */}
            {isMultiCloud && (() => {
                const allServices: Record<string, Record<string, number>> = {};
                data.forEach((d) => {
                    Object.entries(d.byService).forEach(([svc, amt]) => {
                        if (!allServices[svc]) allServices[svc] = {};
                        allServices[svc][d.account.provider] = (allServices[svc][d.account.provider] || 0) + amt;
                    });
                });
                const topServices = Object.entries(allServices)
                    .map(([name, providerSpend]) => ({ name, providerSpend, total: Object.values(providerSpend).reduce((s, v) => s + v, 0) }))
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 10);

                if (topServices.length === 0) return null;

                return (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Cross-Provider Service Costs</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Service-level spend distribution across cloud providers</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {topServices.map((svc) => {
                                const maxSvc = Math.max(...topServices.map(s => s.total), 1);
                                return (
                                    <div key={svc.name}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-medium text-white truncate mr-3">{svc.name}</span>
                                            <span className="text-xs text-slate-400 flex-shrink-0">${svc.total.toFixed(2)}</span>
                                        </div>
                                        <div className="flex h-3 rounded-full overflow-hidden bg-slate-800" style={{ width: `${(svc.total / maxSvc) * 100}%` }}>
                                            {providerSummaries.map((ps) => {
                                                const val = svc.providerSpend[ps.provider] || 0;
                                                const w = svc.total > 0 ? (val / svc.total) * 100 : 0;
                                                if (w === 0) return null;
                                                return (
                                                    <div
                                                        key={ps.provider}
                                                        className={`h-full bg-gradient-to-r ${ps.color.gradient}`}
                                                        style={{ width: `${w}%` }}
                                                        title={`${ps.provider}: $${val.toFixed(2)}`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* ─── Top Services Per Account ─── */}
            <div className="grid gap-6 lg:grid-cols-2">
                {data.filter(d => d.totalSpend > 0).slice(0, 4).map((d) => {
                    const topSvc = Object.entries(d.byService).sort(([, a], [, b]) => b - a).slice(0, 5);
                    const style = getProviderStyle(d.account.provider);

                    return (
                        <div key={d.account.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`h-3 w-3 rounded-full ${style.dot}`} />
                                    <h4 className="text-sm font-semibold text-white">{d.account.accountLabel}</h4>
                                    <span className={`text-[10px] font-medium ${style.text}`}>{d.account.provider}</span>
                                </div>
                                <span className="text-[10px] text-slate-500">{Object.keys(d.byService).length} services</span>
                            </div>
                            <div className="space-y-2">
                                {topSvc.map(([svc, amt]) => (
                                    <div key={svc} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-300 truncate mr-3">{svc}</span>
                                        <span className="text-white font-medium">${amt.toFixed(2)}</span>
                                    </div>
                                ))}
                                {topSvc.length === 0 && <p className="text-xs text-slate-500">No data</p>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ─── Multi-Cloud Insights ─── */}
            {isMultiCloud && grandTotal > 0 && (() => {
                const insights: { emoji: string; title: string; desc: string }[] = [];

                // Highest spending provider
                const topProvider = providerSummaries[0];
                const topPct = (topProvider.totalSpend / grandTotal) * 100;
                insights.push({
                    emoji: "💰",
                    title: `${getProviderLabel(topProvider.provider)} leads at ${topPct.toFixed(0)}%`,
                    desc: `$${topProvider.totalSpend.toFixed(2)} of $${grandTotal.toFixed(2)} total across all providers.`,
                });

                // Provider diversity
                if (providers.size >= 2) {
                    const lowestProvider = providerSummaries[providerSummaries.length - 1];
                    const ratio = topProvider.totalSpend / Math.max(lowestProvider.totalSpend, 0.01);
                    insights.push({
                        emoji: "⚖️",
                        title: ratio > 3 ? "Heavily concentrated spend" : ratio > 1.5 ? "Moderate provider balance" : "Well-balanced multi-cloud",
                        desc: ratio > 3
                            ? `${topProvider.provider} costs ${ratio.toFixed(1)}x more than ${lowestProvider.provider}. Consider cost optimization.`
                            : `Spend is ${ratio > 1.5 ? "moderately" : "well"} distributed across ${providers.size} providers.`,
                    });
                }

                // Service overlap check
                const servicesByProvider = new Map<string, Set<string>>();
                data.forEach((d) => {
                    if (!servicesByProvider.has(d.account.provider)) servicesByProvider.set(d.account.provider, new Set());
                    Object.keys(d.byService).forEach((s) => servicesByProvider.get(d.account.provider)!.add(s));
                });
                const totalServices = new Set([...servicesByProvider.values()].flatMap(s => [...s]));
                insights.push({
                    emoji: "🔍",
                    title: `${totalServices.size} unique services across ${providers.size} providers`,
                    desc: `Tracks cost data from ${data.length} cloud accounts spanning multiple providers.`,
                });

                return (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                            </svg>
                            Multi-Cloud Insights
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">Automated analysis of your multi-cloud spending</p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {insights.map((insight, i) => (
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
                );
            })()}
        </div>
    );
}
