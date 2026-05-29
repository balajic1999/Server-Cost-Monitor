"use client";

import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import { btnPrimary, btnSecondary } from "../lib/ui";

function Wordmark() {
    return (
        <span className="flex items-center gap-2 text-sm">
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-accent"
                aria-hidden
            >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span className="font-serif text-base font-medium tracking-tight text-foreground">CloudPulse</span>
        </span>
    );
}

export default function LandingPage() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-surface">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
                    <Wordmark />
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
                <p className="text-sm font-medium text-accent">Cloud cost clarity</p>
                <h1 className="mt-3 max-w-xl font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
                    Understand spend in seconds.
                </h1>
                <p className="mt-4 max-w-lg text-lg text-muted-foreground">
                    Connect AWS, GCP, or Azure. See today&apos;s spend, monthly total, and trends&mdash;without digging
                    through consoles.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <Link href={user ? "/dashboard" : "/register"} className={btnPrimary}>
                        {user ? "Open dashboard" : "Start free"}
                    </Link>
                    {!user ? (
                        <Link href="/login" className={btnSecondary}>
                            Sign in
                        </Link>
                    ) : null}
                </div>

                <ul className="mt-20 grid gap-8 sm:grid-cols-3">
                    {[
                        { t: "One connect flow", d: "Add all three providers from a single screen." },
                        { t: "Minimal dashboard", d: "Today, month, forecast, 30-day trend, top services." },
                        { t: "Alerts that matter", d: "Email or Slack when budgets bite. No noise." }
                    ].map((x) => (
                        <li key={x.t} className="rounded-lg border border-border bg-surface p-6 shadow-sm">
                            <h2 className="font-serif text-lg font-medium text-foreground">{x.t}</h2>
                            <p className="mt-2 text-sm text-muted-foreground">{x.d}</p>
                        </li>
                    ))}
                </ul>
            </main>

            <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
                CloudPulse &middot; Built for developers
            </footer>
        </div>
    );
}
