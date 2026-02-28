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
}

export default function ComparisonTab({ projectId }: { projectId: string }) {
    const { token } = useAuth();
    const [data, setData] = useState<AccountCost[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const accounts = await listCloudAccounts(token, projectId);
            const today = new Date().toISOString().split("T")[0];
            const monthStart = today.slice(0, 7) + "-01";
            const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

            const results: AccountCost[] = await Promise.all(
                accounts.map(async (account) => {
                    const records = await getCostRecords(token, account.id, thirtyDaysAgo);
                    const totalSpend = records.reduce((s, r) => s + Number(r.amount), 0);
                    const todaySpend = records
                        .filter((r) => r.periodStart.startsWith(today))
                        .reduce((s, r) => s + Number(r.amount), 0);
                    const monthSpend = records
                        .filter((r) => r.periodStart >= monthStart)
                        .reduce((s, r) => s + Number(r.amount), 0);
                    return { account, records, totalSpend, todaySpend, monthSpend };
                })
            );

            setData(results.sort((a, b) => b.totalSpend - a.totalSpend));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, projectId]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="h-24 animate-shimmer rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]" />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
                <p className="text-slate-400">No cloud accounts to compare. Add at least 2 accounts.</p>
            </div>
        );
    }

    const grandTotal = data.reduce((s, d) => s + d.totalSpend, 0);
    const maxSpend = Math.max(...data.map((d) => d.totalSpend), 1);

    return (
        <div className="space-y-6">
            {/* Summary header */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
                        const colors = [
                            "from-indigo-500 to-violet-500",
                            "from-emerald-500 to-teal-500",
                            "from-amber-500 to-orange-500",
                            "from-rose-500 to-pink-500",
                            "from-cyan-500 to-blue-500",
                        ];
                        const colorIdx = data.indexOf(d) % colors.length;

                        return (
                            <div key={d.account.id}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs font-medium text-white truncate">{d.account.accountLabel}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">{d.account.externalAccountId}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400">{pct.toFixed(1)}%</span>
                                        <span className="text-sm font-bold text-white">${d.totalSpend.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full bg-gradient-to-r ${colors[colorIdx]} transition-all duration-500`}
                                        style={{ width: `${barWidth}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detailed table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <div className="p-4 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-white">Detailed Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-800 text-left">
                                <th className="px-4 py-3 text-xs text-slate-500 font-medium">Account</th>
                                <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Today</th>
                                <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">This Month</th>
                                <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">30-Day Total</th>
                                <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((d) => (
                                <tr key={d.account.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-white">{d.account.accountLabel}</p>
                                        <p className="text-[10px] text-slate-500 font-mono">{d.account.provider.toUpperCase()} · {d.account.externalAccountId}</p>
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Top services per account */}
            <div className="grid gap-6 lg:grid-cols-2">
                {data.filter(d => d.totalSpend > 0).slice(0, 4).map((d) => {
                    const byService: Record<string, number> = {};
                    d.records.forEach((r) => {
                        byService[r.serviceName] = (byService[r.serviceName] || 0) + Number(r.amount);
                    });
                    const topSvc = Object.entries(byService).sort(([, a], [, b]) => b - a).slice(0, 5);

                    return (
                        <div key={d.account.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                            <h4 className="text-sm font-semibold text-white mb-3">{d.account.accountLabel} — Top Services</h4>
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
        </div>
    );
}
