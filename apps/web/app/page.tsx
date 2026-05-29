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

const eyebrowClass = "text-xs font-semibold uppercase tracking-widest text-accent";
const h2Class = "mt-3 font-serif text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl";
const cardClass = "rounded-lg border border-border bg-surface p-6 shadow-sm";

function IconTile({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
            {children}
        </div>
    );
}

function CheckIcon({ className = "h-4 w-4 text-accent" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    );
}

export default function LandingPage() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* ─── Nav ───────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 border-b border-border bg-surface">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
                    <Wordmark />
                    <nav className="hidden items-center gap-6 md:flex">
                        <a href="#features" className="text-sm text-muted-foreground transition hover:text-foreground">
                            Features
                        </a>
                        <a href="#how-it-works" className="text-sm text-muted-foreground transition hover:text-foreground">
                            How it works
                        </a>
                        <a href="#pricing" className="text-sm text-muted-foreground transition hover:text-foreground">
                            Pricing
                        </a>
                    </nav>
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

            {/* ─── Hero ──────────────────────────────────────────── */}
            <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6 sm:pt-24">
                <div className="max-w-2xl">
                    <p className="text-sm font-medium text-accent">Cloud cost clarity</p>
                    <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl">
                        Understand cloud spend in seconds.
                    </h1>
                    <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                        Connect AWS, GCP, or Azure. See today&apos;s spend, monthly total, forecast, and trends&mdash;without
                        digging through consoles.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link href={user ? "/dashboard" : "/register"} className={btnPrimary}>
                            {user ? "Open dashboard" : "Start free"}
                        </Link>
                        <a href="#how-it-works" className={btnSecondary}>
                            See how it works
                        </a>
                    </div>
                </div>

                {/* Dashboard preview */}
                <div className="mt-16 rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-muted-strong" />
                        <span className="h-2.5 w-2.5 rounded-full bg-muted-strong" />
                        <span className="h-2.5 w-2.5 rounded-full bg-muted-strong" />
                        <span className="ml-2 text-xs text-subtle-foreground">CloudPulse Dashboard</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                        {[
                            { label: "Today", value: "$24.50" },
                            { label: "This month", value: "$847.32" },
                            { label: "Forecast", value: "$1,205" },
                            { label: "Avg daily", value: "$28.24" }
                        ].map((card) => (
                            <div key={card.label} className="rounded-lg border border-border bg-muted px-3 py-3">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                    {card.label}
                                </p>
                                <p className="mt-1 font-serif text-xl font-medium tabular-nums text-foreground">{card.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex h-20 items-end gap-[3px]">
                        {[35, 42, 28, 55, 48, 62, 45, 38, 72, 58, 44, 52, 40, 65, 48, 55, 42, 36, 60, 48].map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 rounded-t bg-accent/70"
                                style={{ height: `${h}%` }}
                            />
                        ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                        <svg
                            className="h-4 w-4 flex-shrink-0 text-warning"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.75}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                        >
                            <path d="M12 9v4M12 17h.01" />
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        </svg>
                        <p className="text-xs text-warning">Anomaly: spending spike detected &mdash; 65% above 7-day average</p>
                    </div>
                </div>
            </section>

            {/* ─── Features grid ─────────────────────────────────── */}
            <section id="features" className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
                <div className="max-w-2xl">
                    <p className={eyebrowClass}>Features</p>
                    <h2 className={h2Class}>Everything you need to control cloud costs</h2>
                    <p className="mt-4 text-muted-foreground">
                        From real-time dashboards to anomaly detection&mdash;CloudPulse gives you complete visibility and control.
                    </p>
                </div>

                <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        {
                            title: "Real-time cost dashboard",
                            desc: "Track daily, monthly, and forecasted spend with charts. Cross-project overview across all accounts.",
                            icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                    <path d="M3 3v18h18" />
                                    <path d="M7 14l4-4 4 4 5-5" />
                                </svg>
                            )
                        },
                        {
                            title: "Anomaly detection",
                            tag: "New",
                            desc: "Automatically flags spending spikes using 7-day moving averages, new service charges, and concentration risks.",
                            icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                    <path d="M12 3l1.6 4.7L18 9.3l-3.7 2.4 1.4 4.6L12 13.7 8.3 16.3l1.4-4.6L6 9.3l4.4-1.6L12 3z" />
                                </svg>
                            )
                        },
                        {
                            title: "Smart budget alerts",
                            desc: "Set daily and monthly budgets with color-coded progress bars. Get warned by email or Slack before costs spiral.",
                            icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                            )
                        },
                        {
                            title: "Slack notifications",
                            tag: "New",
                            desc: "Rich Block Kit alerts in your Slack channels. Stay informed without checking the dashboard every hour.",
                            icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                            )
                        },
                        {
                            title: "Service breakdown",
                            desc: "See exactly which services cost the most&mdash;EC2, S3, Lambda, RDS&mdash;with percentage bars and ranked lists.",
                            icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                                    <path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5" />
                                    <path d="M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" />
                                </svg>
                            )
                        },
                        {
                            title: "CSV export",
                            desc: "Download cost reports as CSV for finance. Export any date range with service-level detail in one click.",
                            icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <path d="M7 10l5 5 5-5" />
                                    <path d="M12 15V3" />
                                </svg>
                            )
                        }
                    ].map((feature) => (
                        <li key={feature.title} className={cardClass}>
                            <div className="flex items-start justify-between">
                                <IconTile>{feature.icon}</IconTile>
                                {feature.tag ? (
                                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">
                                        {feature.tag}
                                    </span>
                                ) : null}
                            </div>
                            <h3 className="mt-4 text-base font-semibold text-foreground">{feature.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                        </li>
                    ))}
                </ul>
            </section>

            {/* ─── Anomaly deep-dive ─────────────────────────────── */}
            <section className="border-y border-border bg-surface">
                <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
                    <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                        <div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                                Anomaly detection
                            </span>
                            <h2 className={h2Class}>Catch anomalies before they become problems</h2>
                            <p className="mt-4 text-muted-foreground">
                                Three lightweight algorithms run on your cost data and flag suspicious days automatically&mdash;so
                                you never miss a charge.
                            </p>
                            <ul className="mt-8 space-y-5">
                                {[
                                    {
                                        title: "Spike detection",
                                        desc: "Flags days where spend exceeds 1.5× the 7-day moving average.",
                                        tone: "text-danger",
                                        icon: (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                <path d="M12 9v4M12 17h.01" />
                                            </svg>
                                        )
                                    },
                                    {
                                        title: "New service detection",
                                        desc: "Alerts when a service appears for the first time in your billing.",
                                        tone: "text-accent",
                                        icon: (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                                <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
                                            </svg>
                                        )
                                    },
                                    {
                                        title: "Cost concentration",
                                        desc: "Warns when over 70% of spend comes from a single service.",
                                        tone: "text-warning",
                                        icon: (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                                <path d="M3 3v18h18" />
                                                <rect x="7" y="12" width="3" height="6" />
                                                <rect x="12" y="7" width="3" height="11" />
                                                <rect x="17" y="14" width="3" height="4" />
                                            </svg>
                                        )
                                    }
                                ].map((item) => (
                                    <li key={item.title} className="flex items-start gap-3">
                                        <span className={`mt-0.5 flex-shrink-0 ${item.tone}`}>{item.icon}</span>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                                            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className={cardClass}>
                            <div className="mb-4 flex items-center justify-between">
                                <p className="text-sm font-semibold text-foreground">Anomaly detection</p>
                                <span className="text-xs text-muted-foreground">3 findings</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2.5">
                                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                        <path d="M12 9v4M12 17h.01" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Spike on Feb 24</p>
                                        <p className="text-xs text-muted-foreground tabular-nums">$142.50 &mdash; 112% above 7-day average ($67.20)</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-md border border-accent/30 bg-accent-soft/40 px-3 py-2.5">
                                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">New service: Amazon Bedrock</p>
                                        <p className="text-xs text-muted-foreground">First charges appeared on Feb 26</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning/5 px-3 py-2.5">
                                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                        <path d="M3 3v18h18" />
                                        <rect x="7" y="12" width="3" height="6" />
                                        <rect x="12" y="7" width="3" height="11" />
                                        <rect x="17" y="14" width="3" height="4" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">High concentration: EC2</p>
                                        <p className="text-xs text-muted-foreground tabular-nums">78% of total spend from a single service</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Budget deep-dive ──────────────────────────────── */}
            <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
                <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                    <div className={`${cardClass} order-2 lg:order-1`}>
                        <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Budget tracking
                        </p>
                        <div className="space-y-4">
                            {[
                                { label: "Today's spend", value: "$24.50", budget: 50, spent: 24.5, pct: 49, tone: "success" },
                                { label: "This month", value: "$847.32", budget: 1000, spent: 847.32, pct: 85, tone: "warning" },
                                { label: "Monthly forecast", value: "$1,205", budget: 1000, spent: 1205, pct: 120, tone: "danger" }
                            ].map((item) => {
                                const barColor =
                                    item.tone === "success"
                                        ? "bg-success"
                                        : item.tone === "warning"
                                          ? "bg-warning"
                                          : "bg-danger";
                                return (
                                    <div key={item.label} className="rounded-md border border-border bg-muted/40 p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground">{item.label}</p>
                                            <p className="text-sm font-semibold text-foreground tabular-nums">{item.value}</p>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-muted-strong">
                                            <div
                                                className={`h-full rounded-full ${barColor}`}
                                                style={{ width: `${Math.min(item.pct, 100)}%` }}
                                            />
                                        </div>
                                        <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums">
                                            <span className="text-muted-foreground">
                                                {item.pct}% of ${item.budget} budget
                                            </span>
                                            <span className={item.pct > 100 ? "text-danger" : "text-success"}>
                                                {item.pct > 100
                                                    ? `$${(item.spent - item.budget).toFixed(0)} over`
                                                    : `$${(item.budget - item.spent).toFixed(0)} left`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="order-1 lg:order-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                            Budget control
                        </span>
                        <h2 className={h2Class}>Visual budget tracking at a glance</h2>
                        <p className="mt-4 text-muted-foreground">
                            Every stat card shows your spending relative to your budget with color-coded progress bars that go
                            from green to red as you approach the limit.
                        </p>
                        <ul className="mt-6 space-y-3">
                            {[
                                "Color-coded progress: green → amber → red",
                                "Budgets auto-derived from your alert rules",
                                "Remaining balance and percentage shown inline",
                                "Monthly forecast warns you before overspending"
                            ].map((f) => (
                                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                                    <CheckIcon />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* ─── Founder's note ────────────────────────────────── */}
            <section className="border-y border-border bg-surface">
                <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
                    <div className={`${cardClass} p-8 sm:p-10`}>
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden>
                                    <path d="M3 21c0-4 4-6 9-6s9 2 9 6" />
                                    <circle cx="12" cy="8" r="4" />
                                </svg>
                            </div>
                            <div className="space-y-4 leading-relaxed text-foreground">
                                <h3 className="font-serif text-xl font-medium text-foreground">Why I built CloudPulse</h3>
                                <p className="text-muted-foreground">
                                    &ldquo;After an unexpected $1,200 AWS bill for an idle side-project, I realized how broken
                                    cloud cost monitoring is for independent developers and small teams. The native tools are
                                    too complex, and enterprise solutions cost more than the infrastructure itself.&rdquo;
                                </p>
                                <p className="text-muted-foreground">
                                    &ldquo;I built CloudPulse to be the tool I wish I had: simple to set up, secure by default,
                                    and proactive about warning you before disaster strikes. We don&apos;t have a sales team or
                                    fancy corporate logos&mdash;what we do have is a deep commitment to treating your
                                    credentials and data with the respect they deserve.&rdquo;
                                </p>
                                <p className="pt-1 text-sm font-medium text-accent">— The maker of CloudPulse</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── How it works ──────────────────────────────────── */}
            <section id="how-it-works" className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
                <div className="max-w-2xl">
                    <p className={eyebrowClass}>How it works</p>
                    <h2 className={h2Class}>Up and running in three minutes</h2>
                </div>
                <div className="mt-12 grid gap-8 sm:grid-cols-3">
                    {[
                        {
                            step: "01",
                            title: "Connect a cloud",
                            desc: "Add credentials or an IAM role ARN. Everything is encrypted with AES-256-GCM at rest."
                        },
                        {
                            step: "02",
                            title: "Set budgets & alerts",
                            desc: "Define daily or monthly budgets. Pick email or Slack. Set spike-detection thresholds."
                        },
                        {
                            step: "03",
                            title: "Monitor & optimize",
                            desc: "Watch dashboards, review anomalies, drill into costs, export reports, stay under budget."
                        }
                    ].map((item) => (
                        <div key={item.step}>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft font-serif text-base font-medium text-accent tabular-nums">
                                {item.step}
                            </div>
                            <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── Security ──────────────────────────────────────── */}
            <section className="border-y border-border bg-surface">
                <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
                    <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                        <div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                                Security
                            </span>
                            <h2 className={h2Class}>Your cloud access is locked down tight</h2>
                            <p className="mt-4 text-muted-foreground">
                                Your cloud credentials are the keys to your infrastructure. We treat them with the highest level
                                of security available so you can monitor costs with peace of mind.
                            </p>
                            <ul className="mt-8 space-y-6">
                                <li className="flex items-start gap-4">
                                    <IconTile>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    </IconTile>
                                    <div>
                                        <p className="font-semibold text-foreground">Strictly read-only access</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            CloudPulse only requests CostExplorer read permissions. We physically cannot modify
                                            your infrastructure or resources.
                                        </p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <IconTile>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                                            <rect x="3" y="11" width="18" height="11" rx="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    </IconTile>
                                    <div>
                                        <p className="font-semibold text-foreground">AES-256-GCM encryption</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            All credentials and API keys are encrypted at rest using authenticated encryption
                                            with unique initialization vectors per record.
                                        </p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div className={`${cardClass} mx-auto w-full max-w-md`}>
                            <div className="flex flex-col items-center py-6 text-center">
                                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft">
                                    <CheckIcon className="h-10 w-10 text-accent" />
                                </div>
                                <h4 className="mt-5 font-serif text-lg font-medium text-foreground">Connection secured</h4>
                                <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
                                    Credentials encrypted with AES-256-GCM. ReadOnlyAccess policy active.
                                </p>
                                <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted-strong">
                                    <div className="h-full w-full rounded-full bg-success" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Pricing ───────────────────────────────────────── */}
            <section id="pricing" className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
                <div className="max-w-2xl">
                    <p className={eyebrowClass}>Pricing</p>
                    <h2 className={h2Class}>Simple, transparent pricing</h2>
                    <p className="mt-4 text-muted-foreground">Start free. Upgrade when you need more.</p>
                </div>

                <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
                    {/* Free */}
                    <div className={cardClass}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Free</p>
                        <p className="mt-3 font-serif text-3xl font-medium text-foreground">$0</p>
                        <p className="mt-2 text-sm text-muted-foreground">Personal projects and small workloads.</p>
                        <ul className="mt-6 space-y-2.5">
                            {[
                                "1 project",
                                "1 cloud account",
                                "2 alert rules",
                                "30-day data retention",
                                "Email notifications",
                                "Anomaly detection",
                                "CSV export"
                            ].map((f) => (
                                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                                    <CheckIcon className="h-4 w-4 text-muted-foreground" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <Link href="/register" className={`${btnSecondary} mt-8 w-full`}>
                            Get started free
                        </Link>
                    </div>

                    {/* Pro */}
                    <div className={`${cardClass} ring-1 ring-accent`}>
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Pro</p>
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                                Popular
                            </span>
                        </div>
                        <p className="mt-3 font-serif text-3xl font-medium text-foreground">Contact us</p>
                        <p className="mt-2 text-sm text-muted-foreground">Teams with multiple accounts and advanced needs.</p>
                        <ul className="mt-6 space-y-2.5">
                            {[
                                "10 projects",
                                "20 cloud accounts",
                                "50 alert rules",
                                "Unlimited retention",
                                "Email + Slack alerts",
                                "Hourly cost sync",
                                "Anomaly detection",
                                "Budget progress bars",
                                "Priority support"
                            ].map((f) => (
                                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                                    <CheckIcon />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <Link href="/register" className={`${btnPrimary} mt-8 w-full`}>
                            Talk to us
                        </Link>
                    </div>
                </div>
            </section>

            {/* ─── FAQ ───────────────────────────────────────────── */}
            <section className="border-y border-border bg-surface">
                <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
                    <div className="max-w-2xl">
                        <p className={eyebrowClass}>FAQ</p>
                        <h2 className={h2Class}>Common questions</h2>
                    </div>
                    <div className="mt-12 space-y-4">
                        {[
                            {
                                q: "Do you have write access to my cloud account?",
                                a: "No. CloudPulse only requires a read-only IAM policy (specifically `ce:GetCostAndUsage` for AWS, equivalent scopes for GCP and Azure). We cannot provision, modify, or delete any resources."
                            },
                            {
                                q: "How are my credentials stored?",
                                a: "Access keys, service-account JSON, and client secrets are encrypted with AES-256-GCM before they touch our database. They are never returned in plain text via API responses."
                            },
                            {
                                q: "What happens after the Free tier?",
                                a: "You can stay on the Free tier forever if it meets your needs. When you need more projects or features like Slack alerts and hourly sync, you can move to Pro."
                            },
                            {
                                q: "Can I cancel at any time?",
                                a: "Yes. You can cancel a Pro subscription directly from your settings at any time. There are no long-term contracts."
                            },
                            {
                                q: "What about my data? Am I locked in?",
                                a: "Not at all. You own your data. You can export your entire cost history as CSV whenever you like. If you delete your account, we permanently erase your encrypted credentials, alert rules, and synced cost data."
                            }
                        ].map((faq, i) => (
                            <div key={i} className={cardClass}>
                                <h3 className="text-base font-semibold text-foreground">{faq.q}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA ───────────────────────────────────────────── */}
            <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-24">
                <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                    Ready to take control of your cloud costs?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                    Save thousands by monitoring spend with intelligent alerts and anomaly detection. No credit card required.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link href={user ? "/dashboard" : "/register"} className={btnPrimary}>
                        {user ? "Open dashboard" : "Start monitoring free"}
                    </Link>
                    {!user ? (
                        <Link href="/login" className={btnSecondary}>
                            Sign in
                        </Link>
                    ) : null}
                </div>
            </section>

            {/* ─── Footer ────────────────────────────────────────── */}
            <footer className="border-t border-border bg-surface">
                <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
                    <div className="grid gap-8 sm:grid-cols-4">
                        <div className="sm:col-span-2">
                            <Wordmark />
                            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                                Cloud cost clarity for modern teams. Save money, detect anomalies, stay within budget.
                            </p>
                        </div>
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Product
                            </p>
                            <div className="space-y-2">
                                <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground">
                                    Features
                                </a>
                                <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground">
                                    Pricing
                                </a>
                                <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground">
                                    How it works
                                </a>
                            </div>
                        </div>
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal</p>
                            <div className="space-y-2">
                                <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">
                                    Privacy
                                </a>
                                <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">
                                    Terms
                                </a>
                                <a href="#" className="block text-sm text-muted-foreground hover:text-foreground">
                                    Contact
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="mt-10 border-t border-border pt-6 text-center text-xs text-subtle-foreground">
                        &copy; {new Date().getFullYear()} CloudPulse &middot; Built for developers
                    </div>
                </div>
            </footer>
        </div>
    );
}
