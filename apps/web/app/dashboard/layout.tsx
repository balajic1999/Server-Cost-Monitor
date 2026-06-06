"use client";

import { useAuth } from "../../contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { SubscriptionBanner } from "../../components/SubscriptionBanner";
import { PlanBadge } from "../../components/PlanBadge";
import { DashboardFooter } from "../../components/DashboardFooter";

const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/projects", label: "Projects" },
    { href: "/dashboard/compare", label: "Compare" },
    { href: "/dashboard/alerts", label: "Alerts" },
    { href: "/dashboard/settings", label: "Settings" }
] as const;

function Wordmark() {
    return (
        <Link href="/dashboard" className="flex items-center gap-2">
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
        </Link>
    );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace("/login");
    }, [loading, user, router]);

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="flex min-h-screen bg-background">
            {sidebarOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
                    aria-label="Close menu"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-border bg-surface transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex items-center justify-between px-4 py-4">
                    <Wordmark />
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        className="rounded-md p-1 text-muted-foreground lg:hidden"
                        aria-label="Close"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 space-y-px px-2 py-2">
                    {nav.map((item) => {
                        const active =
                            item.href === "/dashboard"
                                ? pathname === "/dashboard"
                                : pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={`flex items-center border-l-2 px-3 py-2 text-sm font-medium transition ${
                                    active
                                        ? "border-accent text-foreground"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-border px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <PlanBadge />
                    </div>
                    <button
                        type="button"
                        onClick={() => logout()}
                        className="mt-2 w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        Sign out
                    </button>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="rounded-md p-2 text-muted-foreground"
                        aria-label="Open menu"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                            />
                        </svg>
                    </button>
                    <Wordmark />
                </header>

                <Suspense fallback={null}>
                    <SubscriptionBanner />
                </Suspense>

                <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>

                <DashboardFooter />
            </div>
        </div>
    );
}
