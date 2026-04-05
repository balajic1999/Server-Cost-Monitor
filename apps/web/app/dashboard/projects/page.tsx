"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useToast } from "../../../contexts/ToastContext";
import { listProjects, createProject, deleteProject, type Project } from "../../../lib/api";
import { btnGhost, btnPrimary, btnSecondary, cardClass, inputClass, labelClass } from "../../../lib/ui";

export default function ProjectsPage() {
  const { addToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProjects(await listProjects());
    } catch {
      addToast("error", "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2) return;
    setCreating(true);
    try {
      const p = await createProject({ name: n, timezone: "UTC" });
      setProjects((prev) => [p, ...prev]);
      setName("");
      addToast("success", "Project created.");
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project and its data?")) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      addToast("success", "Project removed.");
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Projects</h1>
        <p className="mt-1 text-sm text-zinc-500">Group cloud accounts by team or environment.</p>
      </div>

      <div className={cardClass}>
        <h2 className="text-sm font-medium text-zinc-900">New project</h2>
        <form onSubmit={handleCreate} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="pn" className={labelClass}>
              Name
            </label>
            <input
              id="pn"
              className={inputClass}
              placeholder="e.g. Production"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button type="submit" disabled={creating} className={btnPrimary}>
            {creating ? "Adding…" : "Add project"}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-500">No projects yet. Create one above.</p>
        ) : (
          projects.map((p) => (
            <div key={p.id} className={cardClass}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-medium text-zinc-900">{p.name}</h3>
                  <p className="text-xs text-zinc-500">
                    {p.cloudAccounts.length} account{p.cloudAccounts.length !== 1 ? "s" : ""} ·{" "}
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
                  <button type="button" onClick={() => handleDelete(p.id)} className={`${btnGhost} text-red-600 hover:bg-red-50`}>
                    Delete
                  </button>
                </div>
              </div>
              {p.cloudAccounts.length > 0 && (
                <ul className="mt-4 divide-y divide-zinc-100 rounded-md border border-zinc-100">
                  {p.cloudAccounts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-zinc-800">{a.accountLabel}</span>
                      <span className="text-xs text-zinc-500">{a.provider}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
