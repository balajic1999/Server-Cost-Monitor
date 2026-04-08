"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Unhandled error:", error);
    }, [error]);

    return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950/50 border border-red-800/50">
                    <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
                <p className="text-sm text-slate-400 mb-6">
                    {error.message || "An unexpected error occurred. Please try again."}
                </p>
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={reset}
                        className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => window.location.href = "/dashboard"}
                        className="rounded-lg border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
