"use client";

import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import { btnPrimary, btnSecondary } from "../lib/ui";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-xs font-bold text-white">CP</span>
            CloudPulse
          </span>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className={btnPrimary}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={btnSecondary}>
                  Sign in
                </Link>
                <Link href="/register" className={btnPrimary}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-sm font-medium text-blue-600">Cloud cost clarity</p>
        <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Understand spend in seconds.
        </h1>
        <p className="mt-4 max-w-lg text-lg text-zinc-600">
          Connect AWS, GCP, or Azure. See today&apos;s spend, monthly total, and trends—without digging through consoles.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={user ? "/dashboard" : "/register"} className={btnPrimary}>
            {user ? "Open dashboard" : "Start free"}
          </Link>
          <Link href="/login" className={btnSecondary}>
            Sign in
          </Link>
        </div>

        <ul className="mt-20 grid gap-8 sm:grid-cols-3">
          {[
            { t: "One connect flow", d: "Add all three providers from a single screen." },
            { t: "Minimal dashboard", d: "Today, month, budget bar, 7-day trend, top services." },
            { t: "Alerts that matter", d: "Email when budgets bite. No noise." },
          ].map((x) => (
            <li key={x.t} className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-medium text-zinc-900">{x.t}</h2>
              <p className="mt-2 text-sm text-zinc-600">{x.d}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-zinc-200 py-8 text-center text-xs text-zinc-500">
        CloudPulse · Built for developers
      </footer>
    </div>
  );
}
