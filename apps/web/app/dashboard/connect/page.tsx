"use client";

import { Suspense, useCallback, useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "../../../contexts/ToastContext";
import {
    listProjects,
    createProject,
    listCloudAccounts,
    createCloudAccount,
    getMyLimits,
    type CloudAccount,
    type Project,
    type PlanLimitsAndUsage
} from "../../../lib/api";
import {
    btnPrimary,
    btnSecondary,
    cardClass,
    headingTitleClass,
    inputClass,
    labelClass,
    pageDescriptionClass,
    pageHeaderClass,
    pageTitleClass
} from "../../../lib/ui";
import { SectionCard } from "../../../components/SectionCard";

const HELP = {
    AWS: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html",
    GCP: "https://cloud.google.com/iam/docs/keys-create-delete",
    AZURE:
        "https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal"
} as const;

const PROVIDERS = [
    { id: "AWS", label: "AWS" },
    { id: "GCP", label: "GCP" },
    { id: "AZURE", label: "Azure" }
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

function ConnectContent() {
    const router = useRouter();
    const sp = useSearchParams();
    const { addToast } = useToast();

    const [projects, setProjects] = useState<Project[]>([]);
    const [projectId, setProjectId] = useState<string>("");
    const [accounts, setAccounts] = useState<CloudAccount[]>([]);
    const [limits, setLimits] = useState<PlanLimitsAndUsage | null>(null);
    const [loading, setLoading] = useState(true);
    const [provider, setProvider] = useState<ProviderId>("AWS");
    const [newProj, setNewProj] = useState("");
    const [creatingProj, setCreatingProj] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [projs, lim] = await Promise.all([listProjects(), getMyLimits().catch(() => null)]);
            setProjects(projs);
            setLimits(lim);
            const q = sp.get("project");
            const pick = (q && projs.some((p) => p.id === q) ? q : null) ?? projs[0]?.id ?? "";
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

    const accountCap = limits?.limits.cloudAccountsPerProject ?? null;
    const atAccountLimit = accountCap != null && accounts.length >= accountCap;

    if (loading && projects.length === 0) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
            </div>
        );
    }

    async function handleProviderConnected(label: string) {
        await refresh();
        addToast("success", `${label} connected.`);
        router.push("/dashboard");
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div className={pageHeaderClass}>
                <div>
                    <h1 className={pageTitleClass}>Connect a cloud account</h1>
                    <p className={pageDescriptionClass}>
                        AWS, GCP, or Azure. Credentials are encrypted at rest.
                    </p>
                </div>
            </div>

            {projects.length === 0 ? (
                <SectionCard title="Create a project first" description="One project groups one or more cloud accounts.">
                    <form onSubmit={handleCreateProject} className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
                </SectionCard>
            ) : (
                <SectionCard
                    title="Project"
                    description="The cloud account will be linked to this project."
                >
                    <select
                        aria-label="Project"
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
                </SectionCard>
            )}

            {projectId ? (
                <>
                    {accounts.length > 0 ? (
                        <SectionCard title="Connected" description={`${accounts.length} cloud account${accounts.length === 1 ? "" : "s"} on this project.`}>
                            <ul className="space-y-2">
                                {accounts.map((a) => (
                                    <li key={a.id} className="flex items-center justify-between text-sm">
                                        <span className="truncate">
                                            <span className="text-foreground">{a.accountLabel}</span>
                                            <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">
                                                {a.provider.toLowerCase()}
                                            </span>
                                        </span>
                                        <span className="text-xs text-success">● Healthy</span>
                                    </li>
                                ))}
                            </ul>
                        </SectionCard>
                    ) : null}

                    {accountCap != null ? (
                        <p className="text-xs text-muted-foreground">
                            <span className="tabular-nums">
                                {accounts.length} / {accountCap}
                            </span>{" "}
                            cloud account{accountCap === 1 ? "" : "s"} used in this project.
                            {atAccountLimit ? (
                                <>
                                    {" Limit reached. "}
                                    <Link href="/dashboard/settings?tab=billing" className="text-accent hover:underline">
                                        Upgrade
                                    </Link>{" "}
                                    or remove an account in the{" "}
                                    <Link href={`/dashboard/projects/${projectId}`} className="text-accent hover:underline">
                                        project
                                    </Link>{" "}
                                    first.
                                </>
                            ) : null}
                        </p>
                    ) : null}

                    {!atAccountLimit ? (
                        <div className="space-y-4">
                            <div role="tablist" aria-label="Cloud provider" className="inline-flex rounded-md border border-border bg-surface p-1">
                                {PROVIDERS.map((p) => {
                                    const isActive = p.id === provider;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={isActive}
                                            onClick={() => setProvider(p.id)}
                                            className={`rounded px-4 py-1.5 text-sm font-medium transition ${
                                                isActive
                                                    ? "bg-accent text-white"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {provider === "AWS" ? (
                                <ProviderAws projectId={projectId} onDone={() => handleProviderConnected("AWS")} />
                            ) : null}
                            {provider === "GCP" ? (
                                <ProviderGcp projectId={projectId} onDone={() => handleProviderConnected("GCP")} />
                            ) : null}
                            {provider === "AZURE" ? (
                                <ProviderAzure projectId={projectId} onDone={() => handleProviderConnected("Azure")} />
                            ) : null}
                        </div>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}

export default function ConnectPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
                </div>
            }
        >
            <ConnectContent />
        </Suspense>
    );
}

function HelpLink({ href }: { href: string }) {
    return (
        <a href={href} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
            How to get credentials? →
        </a>
    );
}

function ProviderAws({ projectId, onDone }: { projectId: string; onDone: () => void }) {
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
        setBusy(true);
        try {
            const base = { projectId, provider: "AWS" as const, accountLabel: label, externalAccountId: accountId };
            const creds = authType === "role" ? { roleArn } : { accessKey, secretKey };
            await createCloudAccount({ ...base, ...creds });
            onDone();
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <SectionCard title="Amazon Web Services" action={<HelpLink href={HELP.AWS} />}>
            <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className={labelClass}>Account label</label>
                        <input
                            className={inputClass}
                            required
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Production AWS"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>AWS account ID</label>
                        <input
                            className={inputClass}
                            required
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            placeholder="123456789012"
                        />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Authentication</label>
                    <div className="inline-flex rounded-md border border-border bg-surface p-1">
                        <button
                            type="button"
                            onClick={() => setAuthType("keys")}
                            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                                authType === "keys" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Access keys
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthType("role")}
                            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                                authType === "role" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            IAM role (STS)
                        </button>
                    </div>
                </div>
                {authType === "keys" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelClass}>Access key ID</label>
                            <input
                                className={inputClass}
                                required
                                value={accessKey}
                                onChange={(e) => setAccessKey(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Secret access key</label>
                            <input
                                className={inputClass}
                                type="password"
                                required
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                            />
                        </div>
                    </div>
                ) : (
                    <div>
                        <label className={labelClass}>Role ARN</label>
                        <input
                            className={inputClass}
                            required
                            value={roleArn}
                            onChange={(e) => setRoleArn(e.target.value)}
                            placeholder="arn:aws:iam::…:role/…"
                        />
                    </div>
                )}
                <div className="flex justify-end">
                    <button type="submit" disabled={busy} className={btnPrimary}>
                        {busy ? "Connecting…" : "Connect AWS"}
                    </button>
                </div>
            </form>
        </SectionCard>
    );
}

function ProviderGcp({ projectId, onDone }: { projectId: string; onDone: () => void }) {
    const { addToast } = useToast();
    const [label, setLabel] = useState("");
    const [projectNum, setProjectNum] = useState("");
    const [gcpKeyJson, setGcpKeyJson] = useState("");
    const [busy, setBusy] = useState(false);

    async function submit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        try {
            await createCloudAccount({
                projectId,
                provider: "GCP",
                accountLabel: label,
                externalAccountId: projectNum,
                gcpKeyJson
            });
            onDone();
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <SectionCard title="Google Cloud" action={<HelpLink href={HELP.GCP} />}>
            <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className={labelClass}>Account label</label>
                        <input className={inputClass} required value={label} onChange={(e) => setLabel(e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClass}>GCP project ID</label>
                        <input
                            className={inputClass}
                            required
                            value={projectNum}
                            onChange={(e) => setProjectNum(e.target.value)}
                        />
                    </div>
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
                <div className="flex justify-end">
                    <button type="submit" disabled={busy} className={btnPrimary}>
                        {busy ? "Connecting…" : "Connect GCP"}
                    </button>
                </div>
            </form>
        </SectionCard>
    );
}

function ProviderAzure({ projectId, onDone }: { projectId: string; onDone: () => void }) {
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
                azureClientSecret
            });
            onDone();
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <SectionCard title="Microsoft Azure" action={<HelpLink href={HELP.AZURE} />}>
            <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className={labelClass}>Account label</label>
                        <input className={inputClass} required value={label} onChange={(e) => setLabel(e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClass}>Subscription display name</label>
                        <input className={inputClass} required value={subName} onChange={(e) => setSubName(e.target.value)} />
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className={labelClass}>Subscription ID</label>
                        <input
                            className={inputClass}
                            required
                            value={azureSubscriptionId}
                            onChange={(e) => setSubId(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Tenant ID</label>
                        <input
                            className={inputClass}
                            required
                            value={azureTenantId}
                            onChange={(e) => setTenant(e.target.value)}
                        />
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className={labelClass}>Client ID</label>
                        <input
                            className={inputClass}
                            required
                            value={azureClientId}
                            onChange={(e) => setClientId(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Client secret</label>
                        <input
                            className={inputClass}
                            type="password"
                            required
                            value={azureClientSecret}
                            onChange={(e) => setSecret(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <button type="submit" disabled={busy} className={btnPrimary}>
                        {busy ? "Connecting…" : "Connect Azure"}
                    </button>
                </div>
            </form>
        </SectionCard>
    );
}
