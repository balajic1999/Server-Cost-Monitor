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
  getMyLimits,
  type Project,
  type CloudAccount,
  type AlertRule,
  type PlanLimitsAndUsage,
} from "../../../../lib/api";
import { useToast } from "../../../../contexts/ToastContext";
import { btnGhost, btnPrimary, btnSecondary, cardClass, inputClass, labelClass } from "../../../../lib/ui";
import { ConfirmDialog } from "../../../../components/ConfirmDialog";
import { PlanLimitBanner } from "../../../../components/PlanLimitBanner";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [limits, setLimits] = useState<PlanLimitsAndUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState<string | null>(null);
  const [monthly, setMonthly] = useState("");
  const [ruleBusy, setRuleBusy] = useState(false);
  const [accountToRemove, setAccountToRemove] = useState<CloudAccount | null>(null);
  const [removingAccount, setRemovingAccount] = useState(false);
  const [ruleToRemove, setRuleToRemove] = useState<AlertRule | null>(null);
  const [removingRule, setRemovingRule] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, accs, r, lim] = await Promise.all([
        getProject(id),
        listCloudAccounts(id),
        listAlertRules(id).catch(() => [] as AlertRule[]),
        getMyLimits().catch(() => null),
      ]);
      setProject(p);
      setAccounts(accs);
      setRules(r);
      setLimits(lim);
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

  async function confirmRemoveAccount() {
    if (!accountToRemove) return;
    const accountId = accountToRemove.id;
    setRemovingAccount(true);
    try {
      await deleteCloudAccount(accountId);
      setAccounts((a) => a.filter((x) => x.id !== accountId));
      addToast("success", "Account removed.");
      setAccountToRemove(null);
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setRemovingAccount(false);
    }
  }

  async function saveBudget(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    const ruleCapNow = limits?.limits.alertRulesPerProject;
    if (ruleCapNow != null && rules.length >= ruleCapNow) return;
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

  async function confirmRemoveRule() {
    if (!ruleToRemove) return;
    const ruleId = ruleToRemove.id;
    setRemovingRule(true);
    try {
      await deleteAlertRule(ruleId);
      setRules((r) => r.filter((x) => x.id !== ruleId));
      addToast("success", "Removed.");
      setRuleToRemove(null);
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setRemovingRule(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (!project) {
    return <p className="text-sm text-muted-foreground">Project not found.</p>;
  }

  const accountCap = limits?.limits.cloudAccountsPerProject;
  const ruleCap = limits?.limits.alertRulesPerProject;
  const atAccountLimit = accountCap != null && accounts.length >= accountCap;
  const budgetRules = rules.filter((r) => r.monthlyBudget);
  const atRuleLimit = ruleCap != null && rules.length >= ruleCap;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-medium tracking-tight text-foreground">{project.name}</h1>
          <p className="text-sm text-muted-foreground">Timezone {project.timezone}</p>
        </div>
        {atAccountLimit ? (
          <span
            className={`${btnSecondary} cursor-not-allowed opacity-50`}
            aria-disabled="true"
            title={`Plan limit reached (${accountCap} per project)`}
          >
            Connect cloud
          </span>
        ) : (
          <Link href={`/dashboard/connect?project=${project.id}`} className={btnSecondary}>
            Connect cloud
          </Link>
        )}
      </div>

      <PlanLimitBanner kind="cloudAccounts" currentCount={accounts.length} />

      <div className={cardClass}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-foreground">Cloud accounts</h2>
          {accountCap != null && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {accounts.length} / {accountCap} used
            </span>
          )}
        </div>
        {accounts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No accounts yet.{" "}
            {atAccountLimit ? (
              "Plan limit reached."
            ) : (
              <>
                <Link href={`/dashboard/connect?project=${project.id}`} className="text-accent hover:underline">
                  Connect one
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {accounts.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.accountLabel}</p>
                  <p className="text-xs text-muted-foreground">
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
                  <button type="button" onClick={() => setAccountToRemove(a)} className={`${btnGhost} text-danger`}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PlanLimitBanner kind="alertRules" currentCount={rules.length} />

      <div className={cardClass}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-foreground">Monthly budget alert</h2>
          {ruleCap != null && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {rules.length} / {ruleCap} used
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Email when spend crosses this cap (uses your first saved rule pattern).</p>
        {budgetRules.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {budgetRules.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span className="tabular-nums text-foreground">${Number(r.monthlyBudget).toFixed(2)} / mo</span>
                <button type="button" onClick={() => setRuleToRemove(r)} className={btnGhost}>
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
              disabled={atRuleLimit}
            />
          </div>
          <button
            type="submit"
            disabled={ruleBusy || atRuleLimit}
            className={btnPrimary}
            title={atRuleLimit ? `Plan limit reached (${ruleCap} per project)` : undefined}
          >
            {ruleBusy ? "Saving…" : "Add budget"}
          </button>
        </form>
      </div>

      <Link href="/dashboard/projects" className="text-sm text-accent hover:underline">
        ← All projects
      </Link>

      <ConfirmDialog
        open={accountToRemove !== null}
        title="Remove cloud account?"
        description={
          accountToRemove ? (
            <>
              This will remove <span className="font-medium text-foreground">{accountToRemove.accountLabel}</span> from this project. Stored cost records for this account will be deleted.
            </>
          ) : null
        }
        confirmLabel="Remove"
        tone="danger"
        busy={removingAccount}
        onConfirm={confirmRemoveAccount}
        onCancel={() => (removingAccount ? null : setAccountToRemove(null))}
      />

      <ConfirmDialog
        open={ruleToRemove !== null}
        title="Delete budget rule?"
        description={
          ruleToRemove ? (
            <>
              Removing this rule will stop notifications for the{" "}
              <span className="font-medium text-foreground">${Number(ruleToRemove.monthlyBudget).toFixed(2)}</span> monthly cap on this project.
            </>
          ) : null
        }
        confirmLabel="Delete rule"
        tone="danger"
        busy={removingRule}
        onConfirm={confirmRemoveRule}
        onCancel={() => (removingRule ? null : setRuleToRemove(null))}
      />
    </div>
  );
}
