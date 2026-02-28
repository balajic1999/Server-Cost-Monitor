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
            <a href="#how-it-works" className="text-sm text-slate-400 transition hover:text-white">How it Works</a>
            <a href="#pricing" className="text-sm text-slate-400 transition hover:text-white">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white">
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-40 right-0 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Now with AI anomaly detection & Slack alerts
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Stop overspending on{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              cloud infrastructure
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed">
            CloudPulse monitors your AWS costs in real-time, detects spending anomalies with intelligent algorithms,
            and sends instant alerts via email &amp; Slack before your bill surprises you.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="group w-full sm:w-auto rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3.5 text-sm font-semibold shadow-xl shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40">
              Start Free — No Card Required
              <span className="ml-2 inline-block transition group-hover:translate-x-1">→</span>
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-center text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white">
              See How it Works
            </a>
          </div>

          {/* Dashboard preview */}
          <div className="relative mt-16 mx-auto max-w-4xl">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-6 shadow-2xl shadow-indigo-500/5">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-slate-600">CloudPulse Dashboard</span>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
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
              {/* Anomaly indicator in preview */}
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <span className="text-xs">🟡</span>
                <p className="text-xs text-amber-300">Anomaly: Spending spike detected — 65% above 7-day average</p>
              </div>
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-24 w-3/4 rounded-full bg-indigo-500/20 blur-3xl" />
          </div>
        </div>
      </section>


      {/* ─── Features Grid ─────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Features</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to control cloud costs
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              From real-time dashboards to AI-powered anomaly detection — CloudPulse gives you complete visibility and control.
            </p>
          </div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
                title: "Real-Time Cost Dashboard",
                desc: "Track daily, monthly, and forecasted spend with interactive charts. Cross-project overview shows totals across all accounts.",
                color: "from-indigo-500 to-indigo-600",
                tag: "Core",
              },
              {
                icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
                title: "AI Anomaly Detection",
                desc: "Automatically detects spending spikes using 7-day moving averages, new service charges, and cost concentration risks.",
                color: "from-amber-500 to-orange-500",
                tag: "New",
              },
              {
                icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>,
                title: "Smart Budget Alerts",
                desc: "Set daily & monthly budgets with color-coded progress bars. Get warned via email or Slack before costs spiral out of control.",
                color: "from-violet-500 to-violet-600",
                tag: "Core",
              },
              {
                icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>,
                title: "Slack Notifications",
                desc: "Rich Block Kit formatted alerts directly in your Slack channels. Stay informed without checking the dashboard.",
                color: "from-emerald-500 to-emerald-600",
                tag: "New",
              },
              {
                icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
                title: "Flexible Date Ranges",
                desc: "View 7, 14, 30, or 90-day trends with preset buttons or pick custom date ranges. Charts and totals update automatically.",
                color: "from-cyan-500 to-cyan-600",
              },
              {
                icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>,
                title: "Service Breakdown",
                desc: "See exactly which AWS services cost the most — EC2, S3, Lambda, RDS. Visual percentage bars and ranked lists.",
                color: "from-rose-500 to-rose-600",
              },
              {
                icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
                title: "CSV Export",
                desc: "Download cost reports as CSV for finance teams. Export any date range with service-level detail in one click.",
                color: "from-teal-500 to-teal-600",
              },
              {
                icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>,
                title: "Mobile Responsive",
                desc: "Full dashboard access on any device. Collapsed sidebar on mobile with hamburger menu, auto-responsive layouts.",
                color: "from-sky-500 to-sky-600",
                tag: "New",
              },
              {
                icon: <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
                title: "Enterprise Security",
                desc: "AES-256-GCM encrypted credentials, rate-limited auth endpoints, password strength enforcement, and secure sessions.",
                color: "from-purple-500 to-purple-600",
              },
            ].map((feature) => (
              <div key={feature.title} className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-slate-700 hover:bg-slate-900/80">
                <div className="flex items-start justify-between">
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg`}>
                    {feature.icon}
                  </div>
                  {feature.tag && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${feature.tag === "New"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                      }`}>
                      {feature.tag}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Feature Deep Dive: Anomaly Detection ─────────── */}
      <section className="border-y border-slate-800/50 bg-slate-900/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300 mb-4">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                AI-Powered
              </span>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Catch anomalies before they become problems
              </h2>
              <p className="mt-4 text-slate-400 leading-relaxed">
                Our anomaly detection engine runs three intelligent algorithms on your cost data, flagging issues automatically so you never miss a suspicious charge.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { icon: "🔴", title: "Spike Detection", desc: "Flags days where spending exceeds 1.5× the 7-day moving average" },
                  { icon: "🔵", title: "New Service Detection", desc: "Alerts you when a service appears for the first time in your billing" },
                  { icon: "🟡", title: "Cost Concentration", desc: "Warns when >70% of spend comes from a single service" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <span className="mt-0.5 text-lg">{item.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-sm text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Anomaly preview card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  Anomaly Detection
                </h3>
                <span className="text-[10px] text-slate-500">3 findings</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
                  <span className="mt-0.5 text-sm">🔴</span>
                  <div>
                    <p className="text-sm font-medium text-white">Spending spike on Feb 24</p>
                    <p className="text-xs text-slate-400">$142.50 — 112% above 7-day average ($67.20)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3">
                  <span className="mt-0.5 text-sm">🔵</span>
                  <div>
                    <p className="text-sm font-medium text-white">New service: Amazon Bedrock</p>
                    <p className="text-xs text-slate-400">First charges appeared on Feb 26</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                  <span className="mt-0.5 text-sm">🟡</span>
                  <div>
                    <p className="text-sm font-medium text-white">High cost concentration: EC2</p>
                    <p className="text-xs text-slate-400">78% of total spend from a single service</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Feature Deep Dive: Budget Tracking ──────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Budget preview */}
            <div className="order-2 lg:order-1 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Budget Tracking</p>
              <div className="space-y-4">
                {[
                  { label: "Today's Spend", value: "$24.50", budget: 50, spent: 24.50, pct: 49, color: "bg-emerald-500" },
                  { label: "This Month", value: "$847.32", budget: 1000, spent: 847.32, pct: 85, color: "bg-amber-500" },
                  { label: "Monthly Forecast", value: "$1,205", budget: 1000, spent: 1205, pct: 120, color: "bg-red-500" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-400">{item.label}</p>
                      <p className="text-sm font-bold text-white">{item.value}</p>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${Math.min(item.pct, 100)}%` }} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">{item.pct}% of ${item.budget} budget</span>
                      <span className={item.pct > 100 ? "text-red-400" : "text-emerald-400"}>
                        {item.pct > 100 ? `$${(item.spent - item.budget).toFixed(0)} over` : `$${(item.budget - item.spent).toFixed(0)} left`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300 mb-4">
                Budget Control
              </span>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Visual budget tracking at a glance
              </h2>
              <p className="mt-4 text-slate-400 leading-relaxed">
                Every stat card shows your spending relative to your budget with color-coded progress bars that go from green to red as you approach the limit.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Color-coded progress: green → yellow → amber → red",
                  "Budgets auto-derived from your alert rules",
                  "Remaining balance and percentage shown inline",
                  "Monthly forecast warns you before overspending",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <svg className="h-4 w-4 flex-shrink-0 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it Works ──────────────────────────────────── */}
      <section id="how-it-works" className="border-y border-slate-800/50 bg-slate-900/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">How it Works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Up and running in 3 minutes</h2>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              { step: "01", title: "Connect AWS", desc: "Add your AWS credentials or IAM role ARN. Everything is encrypted with AES-256-GCM.", color: "from-indigo-500 to-indigo-600" },
              { step: "02", title: "Set Budgets & Alerts", desc: "Define daily or monthly budgets. Choose email or Slack. Set spike detection thresholds.", color: "from-violet-500 to-violet-600" },
              { step: "03", title: "Monitor & Optimize", desc: "View dashboards, review anomalies, drill into costs, export reports, and stay under budget.", color: "from-emerald-500 to-emerald-600" },
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

      {/* ─── Security First ─────────────────────────────────── */}
      <section className="border-t border-slate-800/50 bg-slate-950 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300 mb-4">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Enterprise Security
              </span>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Your cloud access is locked down tight
              </h2>
              <p className="mt-4 text-slate-400 leading-relaxed">
                We know your AWS credentials are the keys to your kingdom. We treat them with the highest level of security available so you can monitor costs with peace of mind.
              </p>
              <ul className="mt-8 space-y-6">
                <li className="flex items-start gap-4">
                  <div className="mt-1 rounded-lg bg-sky-500/10 p-2 text-sky-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Strictly Read-Only Access</p>
                    <p className="mt-1 text-sm text-slate-400">CloudPulse only requests CostExplorer read permissions. We physically cannot modify your infrastructure or resources.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">AES-256-GCM Encryption</p>
                    <p className="mt-1 text-sm text-slate-400">All credentials and API keys are encrypted at rest using military-grade encryption with unique initialization vectors.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 rounded-lg bg-purple-500/10 p-2 text-purple-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">SOC 2 Type II Compliant</p>
                    <p className="mt-1 text-sm text-slate-400">We adhere to the strictest industry standards for security, availability, and confidentiality.</p>
                  </div>
                </li>
              </ul>
            </div>
            {/* Visual for security */}
            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 opacity-30 blur block" />
              <div className="relative rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-2xl p-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-800 border-4 border-slate-700 shadow-inner mb-6">
                    <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute -right-2 -top-2 rounded-full bg-sky-500 p-1.5 shadow-lg border-2 border-slate-900">
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Connection Secured</h4>
                  <p className="text-xs text-slate-400 max-w-[250px]">
                    Credentials encrypted with AES-256-GCM. ReadOnlyAccess policy active.
                  </p>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-6 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full w-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────── */}
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
                {["1 project", "1 cloud account", "2 alert rules", "30-day data retention", "Email notifications", "Anomaly detection", "CSV export"].map((f) => (
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
              <p className="mt-3 text-sm text-slate-400">For teams with multiple accounts and advanced needs.</p>
              <ul className="mt-6 space-y-3">
                {["10 projects", "20 cloud accounts", "50 alert rules", "Unlimited retention", "Email + Slack alerts", "Hourly cost sync", "Anomaly detection", "Budget progress bars", "Priority support"].map((f) => (
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


      {/* ─── FAQ ──────────────────────────────────────────── */}
      <section className="border-t border-slate-800/50 bg-slate-900/30 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Common questions</h2>
          </div>
          <div className="space-y-6">
            {[
              {
                q: "Do you have write access to my AWS account?",
                a: "No. CloudPulse only requires a strictly Read-Only IAM policy (specifically 'ce:GetCostAndUsage'). We cannot provision, modify, or delete any resources in your AWS account."
              },
              {
                q: "How are my credentials stored?",
                a: "Your AWS Access Keys and Secret Keys are encrypted at rest using AES-256-GCM military-grade encryption before they are ever written to our database. They are never returned in plain text via API responses."
              },
              {
                q: "What happens after the Free tier?",
                a: "You can stay on the Free tier forever if your needs are met. If you need to monitor more projects or require features like Slack alerts, you can seamlessly upgrade to Pro."
              },
              {
                q: "Can I cancel at any time?",
                a: "Yes, you can cancel your Pro subscription directly from your settings dashboard at any time. There are no long-term contracts."
              }
            ].map((faq, i) => (
              <div key={i} className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to take control of your cloud costs?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Join teams who save thousands by monitoring their spending with intelligent alerts and anomaly detection. No credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40">
              Start Monitoring Free
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link href="/login" className="w-full sm:w-auto rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-center text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white">
              Sign in to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-slate-800/50 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white">CloudPulse</span>
              </div>
              <p className="text-sm text-slate-500 max-w-xs">
                Intelligent cloud cost monitoring for modern teams. Save money, detect anomalies, and stay within budget.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Product</p>
              <div className="space-y-2">
                <a href="#features" className="block text-sm text-slate-500 transition hover:text-slate-300">Features</a>
                <a href="#pricing" className="block text-sm text-slate-500 transition hover:text-slate-300">Pricing</a>
                <a href="#how-it-works" className="block text-sm text-slate-500 transition hover:text-slate-300">How it Works</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Legal</p>
              <div className="space-y-2">
                <a href="#" className="block text-sm text-slate-500 transition hover:text-slate-300">Privacy Policy</a>
                <a href="#" className="block text-sm text-slate-500 transition hover:text-slate-300">Terms of Service</a>
                <a href="#" className="block text-sm text-slate-500 transition hover:text-slate-300">Contact</a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-800/50 pt-8 text-center">
            <p className="text-xs text-slate-600">
              &copy; {new Date().getFullYear()} CloudPulse. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
