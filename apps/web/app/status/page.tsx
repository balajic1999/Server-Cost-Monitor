"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { btnSecondary } from "../../lib/ui";

interface HealthData {
  status: string;
  uptime: number;
  version: string;
  timestamp: string;
  db: string;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return [d > 0 ? `${d}d` : "", h > 0 ? `${h}h` : "", `${m}m`].filter(Boolean).join(" ");
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      const res = await fetch(`${apiBase}/health`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setHealth(await res.json());
      setError(false);
    } catch {
      setHealth(null);
      setError(true);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const ok = health?.status === "ok";

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-md space-y-6 pt-12">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">API status</h1>
          <p className="mt-1 text-sm text-zinc-500">Health check</p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          {checking && !health && !error ? (
            <p className="text-sm text-zinc-500">Checking…</p>
          ) : error || !health ? (
            <p className="text-sm text-red-600">Unreachable</p>
          ) : (
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-zinc-500">API</span>
                <span className={ok ? "text-zinc-900" : "text-red-600"}>{ok ? "OK" : "Down"}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-zinc-500">Database</span>
                <span className="text-zinc-900">{health.db}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-zinc-500">Uptime</span>
                <span className="tabular-nums text-zinc-900">{formatUptime(health.uptime)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-zinc-500">Version</span>
                <span className="font-mono text-xs text-zinc-700">{health.version}</span>
              </li>
            </ul>
          )}
          <button type="button" onClick={check} disabled={checking} className={`${btnSecondary} mt-4 w-full`}>
            Refresh
          </button>
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
