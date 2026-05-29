"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useToast } from "../../../contexts/ToastContext";
import {
    listProjects,
    createProject,
    deleteProject,
    getMyLimits,
    getProjectCostSummary,
    type Project,
    type CostSummary,
    type PlanLimitsAndUsage
} from "../../../lib/api";
import {
    btnDanger,
    btnGhost,
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
import { EmptyState } from "../../../components/EmptyState";

function formatMoney(n: number): string {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProjectsPage() {
    const { addToast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [summaries, setSummaries] = useState<Record<string, CostSummary>>({});
    const [limits, setLimits] = useState<PlanLimitsAndUsage | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const [projectList, planInfo] = await Promise.all([listProjects(), getMyLimits().catch(() => null)]);
            setProjects(projectList);
            setLimits(planInfo);

            const sumEntries = await Promise.all(
                projectList.map(async (p) => {
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
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const atProjectLimit = !!limits && limits.usage.projects >= limits.limits.projects;

    async function handleCreate(name: string) {
        const p = await createProject({ name, timezone: "UTC" });
        setProjects((prev) => [p, ...prev]);
        setLimits((prev) =>
            prev ? { ...prev, usage: { ...prev.usage, projects: prev.usage.projects + 1 } } : prev
        );
        addToast("success", "Project created.");
    }

    async function confirmDelete() {
        if (!pendingDelete) return;
        const id = pendingDelete.id;
        setDeleting(true);
        try {
            await deleteProject(id);
            setProjects((prev) => prev.filter((p) => p.id !== id));
            setSummaries((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
            setLimits((prev) =>
                prev ? { ...prev, usage: { ...prev.usage, projects: Math.max(0, prev.usage.projects - 1) } } : prev
            );
            addToast("success", "Project removed.");
            setPendingDelete(null);
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setDeleting(false);
        }
    }

    if (loading) return <ProjectsSkeleton />;

    if (loadError) {
        return (
            <div className="space-y-6">
                <h1 className={pageTitleClass}>Projects</h1>
                <div className={cardClass}>
                    <p className="text-sm font-medium text-foreground">Couldn&rsquo;t load your projects</p>
                    <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
                    <button type="button" onClick={() => load()} className={`${btnPrimary} mt-4`}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className={pageHeaderClass}>
                <div>
                    <h1 className={pageTitleClass}>Projects</h1>
                    <p className={pageDescriptionClass}>
                        Group cloud accounts by team or environment.
                        {limits ? (
                            <>
                                {" · "}
                                <span className="tabular-nums">
                                    {limits.usage.projects} / {limits.limits.projects} used
                                </span>
                            </>
                        ) : null}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    disabled={atProjectLimit}
                    className={btnPrimary}
                    title={atProjectLimit ? `Plan limit reached (${limits?.limits.projects})` : undefined}
                >
                    + New project
                </button>
            </div>

            {atProjectLimit && limits?.plan === "FREE" ? (
                <div className="rounded-md border border-border bg-muted px-4 py-3 text-xs text-muted-foreground">
                    You&rsquo;ve reached the Free plan limit.{" "}
                    <Link href="/dashboard/settings?tab=billing" className="text-accent hover:underline">
                        Upgrade to Pro
                    </Link>{" "}
                    to add up to 10 projects.
                </div>
            ) : null}

            {projects.length === 0 ? (
                <div className={cardClass}>
                    <EmptyState
                        message="No projects yet. Create one to start tracking AWS, GCP, or Azure spend."
                        actionLabel="Create your first project"
                        onAction={() => setCreateOpen(true)}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    {projects.map((p) => {
                        const sum = summaries[p.id];
                        const accountCount = p.cloudAccounts.length;
                        return (
                            <article key={p.id} className={cardClass}>
                                <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <h2 className={headingTitleClass}>{p.name}</h2>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {accountCount} account{accountCount !== 1 ? "s" : ""} ·{" "}
                                            {p._count.alertRules} alert rule{p._count.alertRules !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Link href={`/dashboard/connect?project=${p.id}`} className={btnSecondary}>
                                            Connect cloud
                                        </Link>
                                        <Link href={`/dashboard/projects/${p.id}`} className={btnGhost}>
                                            Manage
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => setPendingDelete(p)}
                                            className={`${btnGhost} text-danger hover:bg-danger/5`}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </header>

                                <p className="mt-4 text-sm text-foreground">
                                    {sum ? (
                                        <>
                                            <span className="tabular-nums font-medium">${formatMoney(Number(sum.todaySpend))}</span>{" "}
                                            <span className="text-muted-foreground">today</span>
                                            <span className="mx-2 text-muted-foreground">·</span>
                                            <span className="tabular-nums font-medium">${formatMoney(Number(sum.monthSpend))}</span>{" "}
                                            <span className="text-muted-foreground">this month</span>
                                            <span className="mx-2 text-muted-foreground">·</span>
                                            <span className="text-muted-foreground">forecast </span>
                                            <span className="tabular-nums font-medium">${formatMoney(Number(sum.monthForecast))}</span>
                                        </>
                                    ) : (
                                        <span className="text-muted-foreground">No spend recorded yet.</span>
                                    )}
                                </p>

                                {accountCount > 0 ? (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        {p.cloudAccounts
                                            .map((a) => `${a.accountLabel} (${a.provider.toLowerCase()})`)
                                            .join(" · ")}
                                    </p>
                                ) : (
                                    <p className="mt-3 text-xs">
                                        <Link
                                            href={`/dashboard/connect?project=${p.id}`}
                                            className="text-accent hover:underline"
                                        >
                                            Connect a cloud account →
                                        </Link>
                                    </p>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}

            {createOpen ? (
                <CreateProjectDialog
                    onClose={() => setCreateOpen(false)}
                    onCreate={handleCreate}
                    atLimit={atProjectLimit}
                    limit={limits?.limits.projects}
                />
            ) : null}

            {pendingDelete ? (
                <ConfirmDeleteModal
                    project={pendingDelete}
                    onCancel={() => setPendingDelete(null)}
                    onConfirm={confirmDelete}
                    deleting={deleting}
                />
            ) : null}
        </div>
    );
}

function CreateProjectDialog({
    onClose,
    onCreate,
    atLimit,
    limit
}: {
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
    atLimit: boolean;
    limit?: number;
}) {
    const { addToast } = useToast();
    const [name, setName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            addToast("warning", "Enter a project name (2+ characters).");
            return;
        }
        if (atLimit) return;
        setSubmitting(true);
        try {
            await onCreate(trimmed);
            onClose();
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            onClick={(e) => {
                if (e.target === e.currentTarget && !submitting) onClose();
            }}
        >
            <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl">
                <h2 id="new-project-title" className={headingTitleClass}>
                    New project
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Group cloud accounts under a name like &ldquo;Production&rdquo; or &ldquo;Staging&rdquo;.
                </p>
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    <div>
                        <label htmlFor="np-name" className={labelClass}>
                            Name
                        </label>
                        <input
                            id="np-name"
                            className={inputClass}
                            placeholder="e.g. Production"
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={atLimit}
                        />
                    </div>
                    {atLimit ? (
                        <p className="text-xs text-muted-foreground">
                            Plan limit reached{limit ? ` (${limit})` : ""}.
                        </p>
                    ) : null}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={onClose} disabled={submitting} className={btnSecondary}>
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting || atLimit} className={btnPrimary}>
                            {submitting ? "Creating…" : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ConfirmDeleteModal({
    project,
    onCancel,
    onConfirm,
    deleting
}: {
    project: Project;
    onCancel: () => void;
    onConfirm: () => void;
    deleting: boolean;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            onClick={(e) => {
                if (e.target === e.currentTarget && !deleting) onCancel();
            }}
        >
            <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl">
                <h2 id="delete-project-title" className={headingTitleClass}>
                    Delete project?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    You&rsquo;re about to delete <span className="font-medium text-foreground">{project.name}</span>. This
                    will permanently remove its cloud accounts, cost history, and alert rules.
                </p>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <li>· {project.cloudAccounts.length} cloud account{project.cloudAccounts.length !== 1 ? "s" : ""}</li>
                    <li>· {project._count.alertRules} alert rule{project._count.alertRules !== 1 ? "s" : ""}</li>
                    <li>· {project._count.costRecords} cost record{project._count.costRecords !== 1 ? "s" : ""}</li>
                </ul>
                <p className="mt-3 text-xs font-medium text-danger">This cannot be undone.</p>
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onCancel} disabled={deleting} className={btnSecondary}>
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm} disabled={deleting} className={btnDanger}>
                        {deleting ? "Deleting…" : "Delete project"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SkelLine({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded bg-muted-strong/60 ${className}`} />;
}

function ProjectsSkeleton() {
    return (
        <div className="space-y-6">
            <div className={pageHeaderClass}>
                <div className="space-y-2">
                    <SkelLine className="h-7 w-32" />
                    <SkelLine className="h-4 w-72" />
                </div>
                <SkelLine className="h-9 w-32" />
            </div>
            <div className="space-y-4">
                {[0, 1].map((i) => (
                    <div key={i} className={cardClass}>
                        <SkelLine className="h-5 w-40" />
                        <SkelLine className="mt-2 h-3 w-56" />
                        <SkelLine className="mt-4 h-4 w-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}
