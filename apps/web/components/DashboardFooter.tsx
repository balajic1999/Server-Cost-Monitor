import Link from "next/link";

const links: { label: string; href: string; external?: boolean }[] = [
    { label: "Status", href: "/status" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Docs", href: "/api/docs", external: true },
    { label: "GitHub", href: "https://github.com/balajic1999/Server-Cost-Monitor", external: true }
];

export function DashboardFooter() {
    return (
        <footer className="mt-12 border-t border-border px-4 py-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                {links.map((l) =>
                    l.external ? (
                        <a
                            key={l.label}
                            href={l.href}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-foreground"
                        >
                            {l.label}
                        </a>
                    ) : (
                        <Link key={l.label} href={l.href} className="hover:text-foreground">
                            {l.label}
                        </Link>
                    )
                )}
                <span className="ml-auto hidden sm:inline">CloudPulse v0.1.0</span>
            </div>
        </footer>
    );
}
