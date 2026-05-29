"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { listProjects, getAlertHistory, type AlertSent } from "../../../lib/api";
import {
    btnPrimary,
    cardClass,
    inputClass,
    pageDescriptionClass,
    pageHeaderClass,
    pageTitleClass
} from "../../../lib/ui";
import { EmptyState } from "../../../components/EmptyState";

type Enriched = AlertSent & { projectName: string; projectId: string };

const CHANNEL_LABELS: Record<string, string> = {
    EMAIL: "Email",
    SLACK: "Slack",
    email: "Email",
    slack: "Slack"
};

export default function AlertsPage() {
    const { addToast } = useToast();
    const [items, setItems] = useState<Enriched[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [selected, setSelected] = useState<Enriched | null>(null);
    const [projectFilter, setProjectFilter] = useState<string>("all");
    const [channelFilter, setChannelFilter] = useState<string>("all");
    const [showRawPayload, setShowRawPayload] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const projects = await listProjects();
            const batches = await Promise.all(
                projects.map(async (p) => {
                    try {
                        const h = await getAlertHistory(p.id);
                        return h.map((x) => ({ ...x, projectName: p.name, projectId: p.id }));
                    } catch {
                        return [];
                    }
                })
            );
            const flat = batches.flat().sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
            setItems(flat);
        } catch {
            setLoadError(true);
            addToast("error", "Could not load alerts.");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        load();
    }, [load]);

    const projectOptions = useMemo(() => {
        const map = new Map<string, string>();
        for (const i of items) map.set(i.projectId, i.projectName);
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [items]);

    const channelOptions = useMemo(() => {
        return Array.from(new Set(items.map((i) => i.channel)));
    }, [items]);

    const filtered = useMemo(() => {
        return items.filter((i) => {
            if (projectFilter !== "all" && i.projectId !== projectFilter) return false;
            if (channelFilter !== "all" && i.channel !== channelFilter) return false;
            return true;
        });
    }, [items, projectFilter, channelFilter]);

    // Reset selection when filters change to avoid showing a hidden item
    useEffect(() => {
        if (selected && !filtered.find((f) => f.id === selected.id)) {
            setSelected(null);
        }
    }, [filtered, selected]);

    if (loading) {
        return <AlertsSkeleton />;
    }

    if (loadError && items.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className={pageTitleClass}>Alerts</h1>
                </div>
                <div className={cardClass}>
                    <p className="text-sm font-medium text-foreground">Couldn&rsquo;t load alerts</p>
                    <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
                    <button type="button" onClick={() => load()} className={`${btnPrimary} mt-4`}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className={pageTitleClass}>Alerts</h1>
                    <p className={pageDescriptionClass}>Triggered notifications across all projects.</p>
                </div>
                <div className={cardClass}>
                    <EmptyState
                        message="No alerts yet. When a budget is breached or a spike is detected, every notification will be recorded here."
                        actionLabel="Set up an alert rule"
                        actionHref="/dashboard/projects"
                    />
                </div>
            </div>
        );
    }

    const lastTriggered = items[0];

    return (
        <div className="space-y-6">
            <div className={pageHeaderClass}>
                <div>
                    <h1 className={pageTitleClass}>Alerts</h1>
                    <p className={pageDescriptionClass}>
                        {filtered.length} of {items.length} alert{items.length !== 1 ? "s" : ""}
                        {lastTriggered ? (
                            <>
                                {" · last triggered "}
                                <span className="text-foreground">{new Date(lastTriggered.sentAt).toLocaleString()}</span>
                            </>
                        ) : null}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <FilterSelect
                    label="Project"
                    value={projectFilter}
                    onChange={setProjectFilter}
                    options={[
                        { value: "all", label: "All projects" },
                        ...projectOptions.map((p) => ({ value: p.id, label: p.name }))
                    ]}
                />
                <FilterSelect
                    label="Channel"
                    value={channelFilter}
                    onChange={setChannelFilter}
                    options={[
                        { value: "all", label: "All channels" },
                        ...channelOptions.map((c) => ({ value: c, label: CHANNEL_LABELS[c] ?? c }))
                    ]}
                />
                {(projectFilter !== "all" || channelFilter !== "all") && (
                    <button
                        type="button"
                        onClick={() => {
                            setProjectFilter("all");
                            setChannelFilter("all");
                        }}
                        className="text-xs font-medium text-accent hover:underline"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {filtered.length === 0 ? (
                <div className={cardClass}>
                    <p className="text-sm text-muted-foreground">No alerts match these filters.</p>
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-5">
                    <div className="space-y-3 lg:col-span-2">
                        {filtered.map((a) => (
                            <button
                                key={a.id}
                                type="button"
                                onClick={() => {
                                    setSelected(a);
                                    setShowRawPayload(false);
                                    if (typeof window !== "undefined" && window.innerWidth < 1024) {
                                        // Scroll detail into view on mobile
                                        setTimeout(() => {
                                            document.getElementById("alert-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                        }, 50);
                                    }
                                }}
                                className={`w-full rounded-lg border px-4 py-3 text-left text-sm shadow-sm transition ${
                                    selected?.id === a.id
                                        ? "border-accent bg-accent-soft/40"
                                        : "border-border bg-surface hover:border-border-strong"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-foreground line-clamp-2">{a.reason}</p>
                                    <ChannelBadge channel={a.channel} />
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {a.projectName} · {new Date(a.sentAt).toLocaleString()}
                                </p>
                            </button>
                        ))}
                    </div>

                    <div id="alert-detail" className="lg:col-span-3">
                        <div className={cardClass}>
                            {!selected ? (
                                <div className="text-sm text-muted-foreground">
                                    <p className="font-medium text-foreground">
                                        {filtered.length} alert{filtered.length !== 1 ? "s" : ""} in current filter
                                    </p>
                                    {filtered[0] ? (
                                        <p className="mt-1">
                                            Last triggered{" "}
                                            <span className="text-foreground">{new Date(filtered[0].sentAt).toLocaleString()}</span>
                                        </p>
                                    ) : null}
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        Select an alert from the list to see its details.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reason</p>
                                        <p className="mt-1 text-sm text-foreground">{selected.reason}</p>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <DetailField label="Project" value={selected.projectName} />
                                        <DetailField label="Channel" value={CHANNEL_LABELS[selected.channel] ?? selected.channel} />
                                        <DetailField label="Sent" value={new Date(selected.sentAt).toLocaleString()} />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Details</p>
                                            <button
                                                type="button"
                                                onClick={() => setShowRawPayload((v) => !v)}
                                                className="text-xs font-medium text-accent hover:underline"
                                            >
                                                {showRawPayload ? "Show summary" : "Show raw payload"}
                                            </button>
                                        </div>
                                        {showRawPayload ? (
                                            <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-muted p-3 text-xs text-foreground">
                                                {JSON.stringify(selected.payload, null, 2)}
                                            </pre>
                                        ) : (
                                            <PayloadSummary payload={selected.payload} />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FilterSelect({
    label,
    value,
    onChange,
    options
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`${inputClass} h-8 w-auto py-0`}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function ChannelBadge({ channel }: { channel: string }) {
    const label = CHANNEL_LABELS[channel] ?? channel;
    const isSlack = /slack/i.test(channel);
    const cls = isSlack
        ? "bg-accent-soft text-accent ring-accent/30"
        : "bg-muted text-muted-foreground ring-border";
    return (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${cls}`}>
            {label}
        </span>
    );
}

function DetailField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm text-foreground">{value}</p>
        </div>
    );
}

function isMoneyKey(k: string) {
    return /amount|spend|budget|cost|threshold|limit|cap|usage/i.test(k);
}

function isPercentKey(k: string) {
    return /pct|percent|percentage/i.test(k);
}

function isDateKey(k: string) {
    return /at$|date|time|period/i.test(k);
}

function humanLabel(k: string) {
    return k
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/^./, (c) => c.toUpperCase())
        .trim();
}

function formatPayloadValue(key: string, value: unknown): string {
    if (value == null) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") {
        if (isMoneyKey(key)) return `$${value.toFixed(2)}`;
        if (isPercentKey(key)) return `${value.toFixed(1)}%`;
        return String(value);
    }
    if (typeof value === "string") {
        if (isDateKey(key) && !Number.isNaN(Date.parse(value))) {
            return new Date(value).toLocaleString();
        }
        if (isMoneyKey(key) && !Number.isNaN(Number(value))) {
            return `$${Number(value).toFixed(2)}`;
        }
        return value;
    }
    return JSON.stringify(value);
}

function PayloadSummary({ payload }: { payload: unknown }) {
    if (!payload || typeof payload !== "object") {
        return <p className="mt-2 text-sm text-muted-foreground">No additional details.</p>;
    }
    const entries = Object.entries(payload as Record<string, unknown>).filter(
        ([, v]) => v !== null && typeof v !== "object"
    );
    if (entries.length === 0) {
        return <p className="mt-2 text-sm text-muted-foreground">No additional details.</p>;
    }
    return (
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {entries.map(([k, v]) => (
                <div key={k} className="rounded-md border border-border bg-muted px-3 py-2">
                    <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{humanLabel(k)}</dt>
                    <dd className="mt-0.5 text-sm tabular-nums text-foreground">{formatPayloadValue(k, v)}</dd>
                </div>
            ))}
        </dl>
    );
}

function SkelLine({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded bg-muted-strong/60 ${className}`} />;
}

function AlertsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <SkelLine className="h-7 w-32" />
                <SkelLine className="h-4 w-56" />
            </div>
            <div className="flex gap-2">
                <SkelLine className="h-8 w-40" />
                <SkelLine className="h-8 w-40" />
            </div>
            <div className="grid gap-6 lg:grid-cols-5">
                <div className="space-y-3 lg:col-span-2">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={cardClass}>
                            <SkelLine className="h-4 w-3/4" />
                            <SkelLine className="mt-2 h-3 w-1/2" />
                        </div>
                    ))}
                </div>
                <div className="lg:col-span-3">
                    <div className={cardClass}>
                        <SkelLine className="h-4 w-32" />
                        <div className="mt-4 space-y-3">
                            <SkelLine className="h-4 w-full" />
                            <SkelLine className="h-4 w-5/6" />
                            <SkelLine className="h-4 w-4/6" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
