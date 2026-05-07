"use client";

import { Suspense, useCallback, useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "../../../contexts/ToastContext";
import Link from "next/link";
import {
  listProjects,
  createProject,
  listCloudAccounts,
  createCloudAccount,
  getMyLimits,
  type CloudAccount,
  type Project,
  type PlanLimitsAndUsage,
} from "../../../lib/api";
import { btnPrimary, cardClass, inputClass, labelClass } from "../../../lib/ui";

const HELP = {
  AWS: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html",
  GCP: "https://cloud.google.com/iam/docs/keys-create-delete",
  AZURE:
    "https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal",
} as const;

function ConnectContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { addToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [limits, setLimits] = useState<PlanLimitsAndUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [newProj, setNewProj] = useState("");
  const [creatingProj, setCreatingProj] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [projs, lim] = await Promise.all([
        listProjects(),
        getMyLimits().catch(() => null),
      ]);
      setProjects(projs);
      setLimits(lim);
      const q = sp.get("project");
      const pick =
        (q && projs.some((p) => p.id === q) ? q : null) ?? projs[0]?.id ?? "";
      setProjectId(pick);
      if (pick) {
        setAccounts(await listCloudAccounts(pick));
      } else {
        setAccounts([]);
      }
    } catch {
      addToast("error", "Could not load data.");
    } finally {
      setLoading(false);
    }
  }, [addToast, sp]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreateProject(e: FormEvent) {
    e.preventDefault();
    const n = newProj.trim();
    if (n.length < 2) return;
    setCreatingProj(true);
    try {
      const p = await createProject({ name: n, timezone: "UTC" });
      setProjects((prev) => [p, ...prev]);
      setProjectId(p.id);
      setAccounts([]);
      setNewProj("");
      addToast("success", "Project ready. Add credentials below.");
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setCreatingProj(false);
    }
  }

  const hasAws = accounts.some((a) => a.provider === "AWS");
  const hasGcp = accounts.some((a) => a.provider === "GCP");
  const hasAzure = accounts.some((a) => a.provider === "AZURE");

  const accountCap = limits?.limits.cloudAccountsPerProject ?? null;
  const atAccountLimit = accountCap != null && accounts.length >= accountCap;

  if (loading && projects.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Connect clouds</h1>
        <p className="mt-1 text-sm text-zinc-500">
          One screen for AWS, GCP, and Azure. Credentials are encrypted at rest.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-zinc-700">Create a project first.</p>
          <form onSubmit={handleCreateProject} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className={labelClass}>Project name</label>
              <input
                className={inputClass}
                value={newProj}
                onChange={(e) => setNewProj(e.target.value)}
                placeholder="e.g. Production"
              />
            </div>
            <button type="submit" disabled={creatingProj} className={btnPrimary}>
              {creatingProj ? "Creating…" : "Create"}
            </button>
          </form>
        </div>
      ) : (
        <div className={cardClass}>
          <label className={labelClass}>Project</label>
          <select
            className={inputClass}
            value={projectId}
            onChange={async (e) => {
              const id = e.target.value;
              setProjectId(id);
              if (id) {
                try {
                  setAccounts(await listCloudAccounts(id));
                } catch {
                  setAccounts([]);
                }
              }
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {projectId && (
        <>
          {accountCap != null && (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              {accounts.length} / {accountCap} cloud account{accountCap === 1 ? "" : "s"} used in this project.
              {atAccountLimit && (
                <>
                  {" Limit reached. "}
                  <Link href="/dashboard/billing" className="text-blue-600 hover:underline">
                    Upgrade
                  </Link>
                  {" or remove an account in the "}
                  <Link href={`/dashboard/projects/${projectId}`} className="text-blue-600 hover:underline">
                    project
                  </Link>
                  {" first."}
                </>
              )}
            </div>
          )}

          <ProviderAws
            projectId={projectId}
            connected={hasAws}
            disabled={atAccountLimit}
            onDone={async () => {
              await refresh();
              addToast("success", "AWS connected.");
              router.push("/dashboard");
            }}
          />
          <ProviderGcp
            projectId={projectId}
            connected={hasGcp}
            disabled={atAccountLimit}
            onDone={async () => {
              await refresh();
              addToast("success", "GCP connected.");
              router.push("/dashboard");
            }}
          />
          <ProviderAzure
            projectId={projectId}
            connected={hasAzure}
            disabled={atAccountLimit}
            onDone={async () => {
              await refresh();
              addToast("success", "Azure connected.");
              router.push("/dashboard");
            }}
          />
        </>
      )}
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600" />
        </div>
      }
    >
      <ConnectContent />
    </Suspense>
  );
}

function Status({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-zinc-100 text-zinc-700" : "bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200"
      }`}
    >
      {ok ? "Connected" : "Not connected"}
    </span>
  );
}

function ProviderAws({
  projectId,
  connected,
  disabled,
  onDone,
}: {
  projectId: string;
  connected: boolean;
  disabled?: boolean;
  onDone: () => void;
}) {
  const { addToast } = useToast();
  const [authType, setAuthType] = useState<"keys" | "role">("keys");
  const [label, setLabel] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [roleArn, setRoleArn] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setBusy(true);
    try {
      const base = { projectId, provider: "AWS" as const, accountLabel: label, externalAccountId: accountId };
      const creds =
        authType === "role" ? { roleArn } : { accessKey, secretKey };
      await createCloudAccount({ ...base, ...creds });
      onDone();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">Amazon Web Services</h2>
        <Status ok={connected} />
      </div>
      <a href={HELP.AWS} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-blue-600 hover:underline">
        How to get credentials?
      </a>
      {connected ? (
        <p className="mt-4 text-sm text-zinc-500">Already linked. Add another account with the form below if needed.</p>
      ) : null}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className={labelClass}>Label</label>
          <input className={inputClass} required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Production AWS" />
        </div>
        <div>
          <label className={labelClass}>AWS account ID</label>
          <input className={inputClass} required value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="123456789012" />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setAuthType("keys")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${authType === "keys" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"}`}>
            Access keys
          </button>
          <button type="button" onClick={() => setAuthType("role")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${authType === "role" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"}`}>
            IAM role ARN
          </button>
        </div>
        {authType === "keys" ? (
          <>
            <div>
              <label className={labelClass}>Access key ID</label>
              <input className={inputClass} required value={accessKey} onChange={(e) => setAccessKey(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Secret access key</label>
              <input className={inputClass} type="password" required value={secretKey} onChange={(e) => setSecretKey(e.target.value)} />
            </div>
          </>
        ) : (
          <div>
            <label className={labelClass}>Role ARN</label>
            <input className={inputClass} required value={roleArn} onChange={(e) => setRoleArn(e.target.value)} placeholder="arn:aws:iam::…:role/…" />
          </div>
        )}
        <button
          type="submit"
          disabled={busy || disabled}
          className={btnPrimary}
          title={disabled ? "Plan limit reached for this project" : undefined}
        >
          {busy ? "Saving…" : "Connect AWS"}
        </button>
      </form>
    </div>
  );
}

function ProviderGcp({
  projectId,
  connected,
  disabled,
  onDone,
}: {
  projectId: string;
  connected: boolean;
  disabled?: boolean;
  onDone: () => void;
}) {
  const { addToast } = useToast();
  const [label, setLabel] = useState("");
  const [projectNum, setProjectNum] = useState("");
  const [gcpKeyJson, setGcpKeyJson] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setBusy(true);
    try {
      await createCloudAccount({
        projectId,
        provider: "GCP",
        accountLabel: label,
        externalAccountId: projectNum,
        gcpKeyJson,
      });
      onDone();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">Google Cloud</h2>
        <Status ok={connected} />
      </div>
      <a href={HELP.GCP} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-blue-600 hover:underline">
        How to get credentials?
      </a>
      {connected ? (
        <p className="mt-4 text-sm text-zinc-500">Already linked. You can add another service account below.</p>
      ) : null}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className={labelClass}>Label</label>
          <input className={inputClass} required value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>GCP project ID</label>
          <input className={inputClass} required value={projectNum} onChange={(e) => setProjectNum(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Service account JSON</label>
          <textarea
            className={`${inputClass} min-h-[120px] font-mono text-xs`}
            required
            value={gcpKeyJson}
            onChange={(e) => setGcpKeyJson(e.target.value)}
            placeholder="{ ... }"
          />
        </div>
        <button
          type="submit"
          disabled={busy || disabled}
          className={btnPrimary}
          title={disabled ? "Plan limit reached for this project" : undefined}
        >
          {busy ? "Saving…" : "Connect GCP"}
        </button>
      </form>
    </div>
  );
}

function ProviderAzure({
  projectId,
  connected,
  disabled,
  onDone,
}: {
  projectId: string;
  connected: boolean;
  disabled?: boolean;
  onDone: () => void;
}) {
  const { addToast } = useToast();
  const [label, setLabel] = useState("");
  const [subName, setSubName] = useState("");
  const [azureSubscriptionId, setSubId] = useState("");
  const [azureTenantId, setTenant] = useState("");
  const [azureClientId, setClientId] = useState("");
  const [azureClientSecret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (disabled) return;
    setBusy(true);
    try {
      await createCloudAccount({
        projectId,
        provider: "AZURE",
        accountLabel: label,
        externalAccountId: subName,
        azureSubscriptionId,
        azureTenantId,
        azureClientId,
        azureClientSecret,
      });
      onDone();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">Microsoft Azure</h2>
        <Status ok={connected} />
      </div>
      <a href={HELP.AZURE} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-blue-600 hover:underline">
        How to get credentials?
      </a>
      {connected ? (
        <p className="mt-4 text-sm text-zinc-500">Already linked. Add another subscription below if needed.</p>
      ) : null}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className={labelClass}>Label</label>
          <input className={inputClass} required value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Subscription display name</label>
          <input className={inputClass} required value={subName} onChange={(e) => setSubName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Subscription ID</label>
          <input className={inputClass} required value={azureSubscriptionId} onChange={(e) => setSubId(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Tenant ID</label>
          <input className={inputClass} required value={azureTenantId} onChange={(e) => setTenant(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Client ID</label>
          <input className={inputClass} required value={azureClientId} onChange={(e) => setClientId(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Client secret</label>
          <input className={inputClass} type="password" required value={azureClientSecret} onChange={(e) => setSecret(e.target.value)} />
        </div>
        <button
          type="submit"
          disabled={busy || disabled}
          className={btnPrimary}
          title={disabled ? "Plan limit reached for this project" : undefined}
        >
          {busy ? "Saving…" : "Connect Azure"}
        </button>
      </form>
    </div>
  );
}
