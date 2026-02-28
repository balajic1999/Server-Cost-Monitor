import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
            <div className="max-w-md w-full text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-4xl font-extrabold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">404</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
                <p className="text-sm text-slate-400 mb-8">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <Link
                        href="/dashboard"
                        className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500"
                    >
                        Go to Dashboard
                    </Link>
                    <Link
                        href="/"
                        className="rounded-lg border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
                    >
                        Home
                    </Link>
                </div>
            </div>
        </main>
    );
}
