"use client";

import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ─── Navbar ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">CloudPulse</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-slate-400 transition hover:text-white">Features</a>
            <a href="#pricing" className="text-sm text-slate-400 transition hover:text-white">Pricing</a>
            <a href="#how-it-works" className="text-sm text-slate-400 transition hover:text-white">How it Works</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white">
                  Sign in
                </Link>
                <Link href="/register" className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-20">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-40 right-0 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Now with Slack alerts & budget tracking
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Stop overspending on{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              cloud infrastructure
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed">
            CloudPulse monitors your AWS costs in real-time, detects spending anomalies,
            and sends instant alerts before your bill surprises you. Save hours and thousands of dollars.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register" className="group rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3.5 text-sm font-semibold shadow-xl shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40">
              Start Free — No Card Required
              <span className="ml-2 inline-block transition group-hover:translate-x-1">→</span>
            </Link>
            <a href="#how-it-works" className="rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white">
              See How it Works
            </a>
          </div>

          {/* Dashboard preview */}
          <div className="relative mt-16 mx-auto max-w-4xl">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-indigo-500/5">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-slate-600">CloudPulse Dashboard</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Today", value: "$24.50", color: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/20" },
                  { label: "This Month", value: "$847.32", color: "from-violet-500/20 to-violet-500/5 border-violet-500/20" },
                  { label: "Forecast", value: "$1,205", color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20" },
                  { label: "Avg Daily", value: "$28.24", color: "from-amber-500/20 to-amber-500/5 border-amber-500/20" },
                ].map((card) => (
                  <div key={card.label} className={`rounded-lg border bg-gradient-to-br p-3 ${card.color}`}>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">{card.label}</p>
                    <p className="mt-1 text-lg font-bold text-white">{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-end gap-[3px] h-20">
                {[35, 42, 28, 55, 48, 62, 45, 38, 72, 58, 44, 52, 40, 65, 48, 55, 42, 36, 60, 48].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-indigo-500/80 to-violet-500/80" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            {/* Glow under the preview */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-24 w-3/4 rounded-full bg-indigo-500/20 blur-3xl" />
          </div>
        </div>
      </section>

      {/* ─── Trusted Numbers ─────────────────────────────────── */}
      <section className="border-y border-slate-800/50 bg-slate-900/30 py-12">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-12 px-6 text-center">
          {[
            { value: "$2.4M+", label: "Cloud costs tracked" },
            { value: "500+", label: "Alert rules active" },
            { value: "99.9%", label: "Uptime SLA" },
            { value: "<5min", label: "Setup time" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Features</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to control cloud costs
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              From real-time monitoring to intelligent alerts, CloudPulse gives you complete visibility into your infrastructure spending.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
                title: "Real-Time Cost Dashboard",
                desc: "Track daily, monthly, and forecasted cloud spend across all your AWS accounts with beautiful, interactive charts.",
                color: "from-indigo-500 to-indigo-600",
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                ),
                title: "Smart Budget Alerts",
                desc: "Set daily and monthly budgets with automatic email and Slack notifications. Get warned before costs spiral.",
                color: "from-violet-500 to-violet-600",
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                ),
                title: "Spike Detection",
                desc: "Automatically detects anomalous spending spikes by comparing against 7-day moving averages.",
                color: "from-amber-500 to-orange-500",
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                  </svg>
                ),
                title: "Service-Level Breakdown",
                desc: "See exactly which AWS services cost the most. EC2, S3, Lambda — drill down into every dollar.",
                color: "from-cyan-500 to-cyan-600",
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                ),
                title: "CSV Export",
                desc: "Download cost reports as CSV files for finance teams, procurement reviews, or offline analysis.",
                color: "from-emerald-500 to-emerald-600",
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
                title: "Encrypted Credentials",
                desc: "AWS credentials are encrypted with AES-256-GCM before storage. Your keys are never exposed in API responses.",
                color: "from-rose-500 to-rose-600",
              },
            ].map((feature) => (
              <div key={feature.title} className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-slate-700 hover:bg-slate-900/80">
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it Works ────────────────────────────────────── */}
      <section id="how-it-works" className="border-y border-slate-800/50 bg-slate-900/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">How it Works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Up and running in 3 minutes</h2>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Connect AWS",
                desc: "Add your AWS credentials or IAM role ARN. We encrypt everything with AES-256-GCM.",
                color: "from-indigo-500 to-indigo-600",
              },
              {
                step: "02",
                title: "Set Budgets & Alerts",
                desc: "Define daily or monthly budgets. Choose email or Slack notifications. Set spike detection thresholds.",
                color: "from-violet-500 to-violet-600",
              },
              {
                step: "03",
                title: "Monitor & Optimize",
                desc: "View real-time dashboards, drill into service costs, export reports, and stay under budget.",
                color: "from-emerald-500 to-emerald-600",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-xl font-bold text-white shadow-xl`}>
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ────────────────────────────────────────── */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Pricing</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">Start free. Upgrade when you need more power.</p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 mx-auto max-w-3xl">
            {/* Free Plan */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Free</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="text-sm text-slate-500">/month</span>
              </div>
              <p className="mt-3 text-sm text-slate-400">Perfect for personal projects and small workloads.</p>
              <ul className="mt-6 space-y-3">
                {["1 project", "1 cloud account", "2 alert rules", "30-day data retention", "Email notifications", "Daily cost sync"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <svg className="h-4 w-4 flex-shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="mt-8 block w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 text-center text-sm font-semibold text-white transition hover:border-slate-600 hover:bg-slate-800">
                Get Started Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-2xl border-2 border-indigo-500/50 bg-slate-900/50 p-8 shadow-xl shadow-indigo-500/5">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-1 text-xs font-semibold text-white shadow-lg">
                Most Popular
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Pro</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$29</span>
                <span className="text-sm text-slate-500">/month</span>
              </div>
              <p className="mt-3 text-sm text-slate-400">For teams and growing businesses with multiple accounts.</p>
              <ul className="mt-6 space-y-3">
                {["10 projects", "20 cloud accounts", "50 alert rules", "Unlimited data retention", "Email + Slack notifications", "Hourly cost sync", "CSV export", "Priority support"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <svg className="h-4 w-4 flex-shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="mt-8 block w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500">
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────── */}
      <section className="border-t border-slate-800/50 bg-slate-900/30 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to take control of your cloud costs?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Join teams who save thousands by monitoring their infrastructure spend in real-time. No credit card required.
          </p>
          <Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40">
            Start Monitoring Free
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/50 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-400">CloudPulse</span>
          </div>
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} CloudPulse. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-slate-500 transition hover:text-slate-300">Privacy</a>
            <a href="#" className="text-xs text-slate-500 transition hover:text-slate-300">Terms</a>
            <a href="#" className="text-xs text-slate-500 transition hover:text-slate-300">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
