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
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-md space-y-6 pt-12">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground">API status</h1>
          <p className="mt-1 text-sm text-muted-foreground">Health check</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          {checking && !health && !error ? (
            <p className="text-sm text-muted-foreground">Checking…</p>
          ) : error || !health ? (
            <p className="text-sm text-danger">Unreachable</p>
          ) : (
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-muted-foreground">API</span>
                <span className={ok ? "text-foreground" : "text-danger"}>{ok ? "OK" : "Down"}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Database</span>
                <span className="text-foreground">{health.db}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Uptime</span>
                <span className="tabular-nums text-foreground">{formatUptime(health.uptime)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono text-xs text-foreground">{health.version}</span>
              </li>
            </ul>
          )}
          <button type="button" onClick={check} disabled={checking} className={`${btnSecondary} mt-4 w-full`}>
            Refresh
          </button>
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-accent hover:underline">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
