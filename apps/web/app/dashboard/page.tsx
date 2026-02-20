"use client";

import { useEffect, useState, FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listProjects, createProject, deleteProject, Project } from "../../lib/api";
import Link from "next/link";

export default function DashboardPage() {
    const { token } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (!token) return;
        listProjects(token)
            .then(setProjects)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [token]);

    async function handleDelete(id: string) {
        if (!token || !confirm("Delete this project? All data will be lost.")) return;
        try {
            await deleteProject(token, id);
            setProjects((p) => p.filter((x) => x.id !== id));
        } catch { }
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Projects</h1>
                    <p className="mt-1 text-sm text-slate-400">Manage your cloud cost monitoring projects</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New Project
                </button>
            </div>

            {/* Project grid */}
            {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 py-20">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800">
                        <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                    </div>
                    <p className="text-lg font-medium text-white">No projects yet</p>
                    <p className="mt-1 text-sm text-slate-400">Create your first project to start monitoring costs</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                    >
                        Create Project
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map((p) => (
                        <div key={p.id} className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700 hover:bg-slate-900">
                            <Link href={`/dashboard/projects/${p.id}`} className="absolute inset-0 z-10" />

                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-400">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                    </svg>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                                    className="relative z-20 rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-red-950/50 hover:text-red-400 group-hover:opacity-100"
                                    title="Delete project"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                            </div>

                            <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                            <p className="mt-1 text-xs text-slate-500">Timezone: {p.timezone}</p>

                            <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                                    {p.cloudAccounts.length} account{p.cloudAccounts.length !== 1 ? "s" : ""}
                                </span>
                                <span>{p._count.costRecords} records</span>
                                <span>{p._count.alertRules} alert{p._count.alertRules !== 1 ? "s" : ""}</span>
                            </div>

                            <div className="mt-4 text-xs text-slate-600">
                                Created {new Date(p.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create modal */}
            {showModal && (
                <CreateProjectModal
                    onClose={() => setShowModal(false)}
                    onCreated={(p) => {
                        setProjects((prev) => [p, ...prev]);
                        setShowModal(false);
                    }}
                />
            )}
        </div>
    );
}

function CreateProjectModal({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: (p: Project) => void;
}) {
    const { token } = useAuth();
    const [name, setName] = useState("");
    const [timezone, setTimezone] = useState("UTC");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!token) return;
        setError("");
        setLoading(true);
        try {
            const project = await createProject(token, { name, timezone });
            onCreated(project);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-white">New Project</h2>
                <p className="mt-1 text-sm text-slate-400">Set up a new cloud cost monitoring project</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {error && (
                        <div className="rounded-lg border border-red-800/50 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="project-name" className="mb-1.5 block text-sm font-medium text-slate-300">Project Name</label>
                        <input
                            id="project-name"
                            type="text"
                            required
                            minLength={2}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            placeholder="e.g. Production AWS"
                        />
                    </div>

                    <div>
                        <label htmlFor="timezone" className="mb-1.5 block text-sm font-medium text-slate-300">Timezone</label>
                        <select
                            id="timezone"
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        >
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">US Eastern</option>
                            <option value="America/Chicago">US Central</option>
                            <option value="America/Denver">US Mountain</option>
                            <option value="America/Los_Angeles">US Pacific</option>
                            <option value="Europe/London">London</option>
                            <option value="Europe/Berlin">Berlin</option>
                            <option value="Asia/Kolkata">India (IST)</option>
                            <option value="Asia/Tokyo">Tokyo</option>
                            <option value="Asia/Shanghai">Shanghai</option>
                            <option value="Australia/Sydney">Sydney</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
                        >
                            {loading ? "Creating…" : "Create Project"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
