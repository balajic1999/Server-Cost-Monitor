"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getProject,
  listCloudAccounts,
  deleteCloudAccount,
  fetchCosts,
  listAlertRules,
  createAlertRule,
  deleteAlertRule,
  type Project,
  type CloudAccount,
  type AlertRule,
} from "../../../../lib/api";
import { useToast } from "../../../../contexts/ToastContext";
import { btnGhost, btnPrimary, btnSecondary, cardClass, inputClass, labelClass } from "../../../../lib/ui";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState<string | null>(null);
  const [monthly, setMonthly] = useState("");
  const [ruleBusy, setRuleBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, accs, r] = await Promise.all([
        getProject(id),
        listCloudAccounts(id),
        listAlertRules(id).catch(() => [] as AlertRule[]),
      ]);
      setProject(p);
      setAccounts(accs);
      setRules(r);
    } catch (err) {
      addToast("error", (err as Error).message);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFetch(accountId: string) {
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    setFetching(accountId);
    try {
      const r = await fetchCosts(accountId, start, end);
      addToast("success", `Synced ${r.recordsUpserted} records.`);
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setFetching(null);
    }
  }

  async function handleDeleteAccount(accountId: string) {
    if (!confirm("Remove this account?")) return;
    try {
      await deleteCloudAccount(accountId);
      setAccounts((a) => a.filter((x) => x.id !== accountId));
      addToast("success", "Account removed.");
    } catch (err) {
      addToast("error", (err as Error).message);
    }
  }

  async function saveBudget(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    const n = parseFloat(monthly);
    if (Number.isNaN(n) || n <= 0) {
      addToast("warning", "Enter a positive monthly budget.");
      return;
    }
    setRuleBusy(true);
    try {
      const rule = await createAlertRule({ projectId: id, monthlyBudget: n, emailEnabled: true });
      setRules((prev) => [...prev, rule]);
      setMonthly("");
      addToast("success", "Budget rule saved.");
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setRuleBusy(false);
    }
  }

  async function removeRule(ruleId: string) {
    if (!confirm("Delete this budget rule?")) return;
    try {
      await deleteAlertRule(ruleId);
      setRules((r) => r.filter((x) => x.id !== ruleId));
      addToast("success", "Removed.");
    } catch (err) {
      addToast("error", (err as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600" />
      </div>
    );
  }

  if (!project) {
    return <p className="text-sm text-zinc-500">Project not found.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{project.name}</h1>
          <p className="text-sm text-zinc-500">Timezone {project.timezone}</p>
        </div>
        <Link href={`/dashboard/connect?project=${project.id}`} className={btnSecondary}>
          Connect cloud
        </Link>
      </div>

      <div className={cardClass}>
        <h2 className="text-sm font-medium text-zinc-900">Cloud accounts</h2>
        {accounts.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No accounts yet.{" "}
            <Link href={`/dashboard/connect?project=${project.id}`} className="text-blue-600 hover:underline">
              Connect one
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {accounts.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{a.accountLabel}</p>
                  <p className="text-xs text-zinc-500">
                    {a.provider} · {a.externalAccountId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleFetch(a.id)}
                    disabled={fetching === a.id}
                    className={btnSecondary}
                  >
                    {fetching === a.id ? "Syncing…" : "Sync costs"}
                  </button>
                  <button type="button" onClick={() => handleDeleteAccount(a.id)} className={`${btnGhost} text-red-600`}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cardClass}>
        <h2 className="text-sm font-medium text-zinc-900">Monthly budget alert</h2>
        <p className="mt-1 text-xs text-zinc-500">Email when spend crosses this cap (uses your first saved rule pattern).</p>
        {rules.filter((r) => r.monthlyBudget).length > 0 ? (
          <ul className="mt-4 space-y-2">
            {rules
              .filter((r) => r.monthlyBudget)
              .map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span className="tabular-nums text-zinc-800">${Number(r.monthlyBudget).toFixed(2)} / mo</span>
                  <button type="button" onClick={() => removeRule(r.id)} className={btnGhost}>
                    Remove
                  </button>
                </li>
              ))}
          </ul>
        ) : null}
        <form onSubmit={saveBudget} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className={labelClass}>Monthly cap (USD)</label>
            <input
              className={inputClass}
              type="number"
              step="0.01"
              min="1"
              placeholder="5000"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
            />
          </div>
          <button type="submit" disabled={ruleBusy} className={btnPrimary}>
            {ruleBusy ? "Saving…" : "Add budget"}
          </button>
        </form>
      </div>

      <Link href="/dashboard/projects" className="text-sm text-blue-600 hover:underline">
        ← All projects
      </Link>
    </div>
  );
}
