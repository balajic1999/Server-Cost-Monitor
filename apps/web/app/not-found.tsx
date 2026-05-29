import Link from "next/link";
import { btnPrimary, btnSecondary } from "../lib/ui";

export default function NotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
            <div className="w-full max-w-md text-center">
                <p className="text-sm font-medium text-subtle-foreground">404</p>
                <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-foreground">Page not found</h1>
                <p className="mt-2 text-sm text-muted-foreground">That URL doesn&apos;t exist.</p>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                    <Link href="/dashboard" className={btnPrimary}>
                        Dashboard
                    </Link>
                    <Link href="/" className={btnSecondary}>
                        Home
                    </Link>
                </div>
            </div>
        </main>
    );
}
