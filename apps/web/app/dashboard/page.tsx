"use client";

import { useCallback, useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { useToast } from "../../contexts/ToastContext";
import {
  listProjects,
  createProject,
  getProjectCostSummary,
  listCloudAccounts,
  getCostRecords,
  getAlertHistory,
  listAlertRules,
  type Project,
  type CostSummary,
  type CostRecord,
  type AlertSent,
  type AlertRule,
} from "../../lib/api";
import { btnPrimary, btnSecondary, cardClass, inputClass, labelClass } from "../../lib/ui";

function startDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export default function DashboardPage() {
  const { addToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [summaries, setSummaries] = useState<Record<string, CostSummary>>({});
  const [records7d, setRecords7d] = useState<CostRecord[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<(AlertSent & { projectName: string })[]>([]);
  const [budgetRules, setBudgetRules] = useState<{ projectId: string; rule: AlertRule }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const projs = await listProjects();
      setProjects(projs);

      const sumEntries = await Promise.all(
        projs.map(async (p) => {
          try {
            const s = await getProjectCostSummary(p.id);
            return [p.id, s] as const;
          } catch {
            return [p.id, null] as const;
          }
        })
      );
      const sm: Record<string, CostSummary> = {};
      for (const [id, s] of sumEntries) {
        if (s) sm[id] = s;
      }
      setSummaries(sm);

      const start = startDateDaysAgo(7);
      const allRecords: CostRecord[] = [];
      const rulesAcc: { projectId: string; rule: AlertRule }[] = [];

      for (const p of projs) {
        try {
          const rules = await listAlertRules(p.id);
          for (const r of rules) {
            if (r.monthlyBudget != null && Number(r.monthlyBudget) > 0) {
              rulesAcc.push({ projectId: p.id, rule: r });
            }
          }
        } catch {
          /* skip */
        }

        try {
          const accs = await listCloudAccounts(p.id);
          const batches = await Promise.all(
            accs.map((a) => getCostRecords(a.id, start).catch(() => [] as CostRecord[]))
          );
          allRecords.push(...batches.flat());
        } catch {
          /* skip */
        }
      }
      setRecords7d(allRecords);
      setBudgetRules(rulesAcc);

      const alertBatches = await Promise.all(
        projs.map(async (p) => {
          try {
            const h = await getAlertHistory(p.id);
            return h.map((x) => ({ ...x, projectName: p.name }));
          } catch {
            return [];
          }
        })
      );
      const flat = alertBatches.flat().sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      setRecentAlerts(flat.slice(0, 3));
    } catch {
      addToast("error", "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const vals = Object.values(summaries);
    return {
      today: vals.reduce((s, v) => s + Number(v.todaySpend ?? 0), 0),
      month: vals.reduce((s, v) => s + Number(v.monthSpend ?? 0), 0),
    };
  }, [summaries]);

  const monthlyBudgetCap = useMemo(() => {
    const r = budgetRules[0];
    if (!r?.rule.monthlyBudget) return null;
    return Number(r.rule.monthlyBudget);
  }, [budgetRules]);

  const budgetPct =
    monthlyBudgetCap && monthlyBudgetCap > 0
      ? Math.min(100, Math.round((totals.month / monthlyBudgetCap) * 100))
      : null;

  const chartDays = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const r of records7d) {
      const d = r.periodStart.split("T")[0];
      byDate[d] = (byDate[d] ?? 0) + Number(r.amount);
    }
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const x = new Date();
      x.setDate(x.getDate() - i);
      days.push(x.toISOString().split("T")[0]);
    }
    return days.map((date) => ({ date, amount: byDate[date] ?? 0 }));
  }, [records7d]);

  const chartMax = Math.max(...chartDays.map((d) => d.amount), 1);

  const topServices = useMemo(() => {
    const bySvc: Record<string, number> = {};
    for (const r of records7d) {
      bySvc[r.serviceName] = (bySvc[r.serviceName] ?? 0) + Number(r.amount);
    }
    return Object.entries(bySvc)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [records7d]);

  const totalAccounts = projects.reduce((n, p) => n + p.cloudAccounts.length, 0);

  async function handleCreateProject(e: FormEvent) {
    e.preventDefault();
    const name = newProjectName.trim();
    if (name.length < 2) {
      addToast("warning", "Enter a project name (2+ characters).");
      return;
    }
    setCreating(true);
    try {
      const p = await createProject({ name, timezone: "UTC" });
      setProjects((prev) => [p, ...prev]);
      setNewProjectName("");
      addToast("success", "Project created.");
      await load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Create a project, then connect your clouds in one step.</p>
        </div>
        <div className={cardClass}>
          <h2 className="text-sm font-medium text-zinc-900">New project</h2>
          <p className="mt-1 text-sm text-zinc-500">One project is enough to start. You can add more later.</p>
          <form onSubmit={handleCreateProject} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="np" className={labelClass}>
                Name
              </label>
              <input
                id="np"
                className={inputClass}
                placeholder="e.g. Production"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <button type="submit" disabled={creating} className={btnPrimary}>
              {creating ? "Creating…" : "Create project"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {projects.length} project{projects.length !== 1 ? "s" : ""} · {totalAccounts} connection
            {totalAccounts !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/connect" className={btnSecondary}>
            Connect clouds
          </Link>
          <Link href="/dashboard/projects" className={btnSecondary}>
            Projects
          </Link>
        </div>
      </div>

      {totalAccounts === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-6 text-center">
          <p className="text-sm font-medium text-zinc-900">No cloud accounts yet</p>
          <p className="mt-1 text-sm text-zinc-500">Connect AWS, GCP, or Azure in one screen.</p>
          <Link href="/dashboard/connect" className={`${btnPrimary} mt-4 inline-flex`}>
            Connect your cloud account
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Spend today" value={`$${totals.today.toFixed(2)}`} />
        <Stat label="Spend this month" value={`$${totals.month.toFixed(2)}`} />
        <div className={cardClass}>
          <p className="text-xs font-medium text-zinc-500">Budget usage</p>
          {monthlyBudgetCap != null && budgetPct != null ? (
            <>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">{budgetPct}%</p>
              <p className="mt-0.5 text-xs text-zinc-500">of ${monthlyBudgetCap.toFixed(0)} monthly cap</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Set a monthly budget under a project’s alerts.</p>
          )}
        </div>
        <div className={cardClass}>
          <p className="text-xs font-medium text-zinc-500">Quick links</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/dashboard/alerts" className="text-blue-600 hover:underline">
                View alerts
              </Link>
            </li>
            <li>
              <Link href="/dashboard/settings" className="text-blue-600 hover:underline">
                Settings
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${cardClass} lg:col-span-2`}>
          <h2 className="text-sm font-medium text-zinc-900">Cost trend · last 7 days</h2>
          <p className="text-xs text-zinc-500">All connected accounts combined</p>
          <div className="mt-6 flex h-44 items-end gap-2">
            {chartDays.map(({ date, amount }) => {
              const hPx = Math.max(4, (amount / chartMax) * 160);
              return (
                <div key={date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="w-full max-w-8 rounded-t bg-blue-600"
                    style={{ height: hPx }}
                    title={`$${amount.toFixed(2)}`}
                  />
                  <span className="text-[10px] text-zinc-400">
                    {new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "narrow" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="text-sm font-medium text-zinc-900">Top services</h2>
          <p className="text-xs text-zinc-500">Last 7 days</p>
          <ul className="mt-4 space-y-3">
            {topServices.length === 0 ? (
              <li className="text-sm text-zinc-500">No cost data yet. Run a sync from Projects.</li>
            ) : (
              topServices.map(([name, amt], i) => (
                <li key={name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-zinc-700">
                    <span className="mr-2 tabular-nums text-zinc-400">{i + 1}.</span>
                    {name}
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-zinc-900">${amt.toFixed(2)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-900">Recent alerts</h2>
          <Link href="/dashboard/alerts" className="text-xs font-medium text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        {recentAlerts.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No alerts yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {recentAlerts.map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-zinc-900">{a.reason}</p>
                  <p className="text-xs text-zinc-500">
                    {a.projectName} · {new Date(a.sentAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs text-zinc-400">{a.channel}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={cardClass}>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">{value}</p>
    </div>
  );
}
