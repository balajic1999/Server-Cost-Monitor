"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "../../../contexts/ToastContext";
import { listProjects, getAlertHistory, type AlertSent } from "../../../lib/api";
import { cardClass } from "../../../lib/ui";

type Enriched = AlertSent & { projectName: string; projectId: string };

export default function AlertsPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Enriched | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
      addToast("error", "Could not load alerts.");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Alerts</h1>
        <p className="mt-1 text-sm text-zinc-500">Triggered notifications across all projects.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          {items.length === 0 ? (
            <div className={cardClass}>
              <p className="text-sm text-zinc-500">No alerts yet. Configure rules from a project.</p>
            </div>
          ) : (
            items.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(a)}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm shadow-sm transition ${
                  selected?.id === a.id
                    ? "border-blue-200 bg-blue-50/50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <p className="font-medium text-zinc-900 line-clamp-2">{a.reason}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {a.projectName} · {new Date(a.sentAt).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          <div className={cardClass}>
            {!selected ? (
              <p className="text-sm text-zinc-500">Select an alert to view payload details.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Reason</p>
                  <p className="mt-1 text-sm text-zinc-900">{selected.reason}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Channel</p>
                  <p className="mt-1 text-sm text-zinc-700">{selected.channel}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Project</p>
                  <p className="mt-1 text-sm text-zinc-700">{selected.projectName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Sent</p>
                  <p className="mt-1 text-sm text-zinc-700">{new Date(selected.sentAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Payload</p>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-800">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
