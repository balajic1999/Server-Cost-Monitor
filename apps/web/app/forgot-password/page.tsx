"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { forgotPassword } from "../../lib/api";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resetToken, setResetToken] = useState<string | null>(null);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const result = await forgotPassword(email);
            setSuccess(true);
            // In dev mode, the API returns the token for testing
            if (result.resetToken) {
                setResetToken(result.resetToken);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
            {/* Background glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/10 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md space-y-8">
                {/* Header */}
                <div className="text-center">
                    <Link href="/" className="inline-flex items-center gap-3 mb-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">CloudPulse</span>
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Reset your password</h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Enter your email and we&apos;ll send you a link to reset your password
                    </p>
                </div>

                {success ? (
                    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-8">
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-800/50 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
                            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            If that email is registered, a reset link has been sent.
                        </div>

                        {resetToken && (
                            <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3">
                                <p className="text-xs text-amber-400 font-medium mb-1">🔧 Dev Mode — Reset Token:</p>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/reset-password?token=${resetToken}`}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 underline break-all transition"
                                    >
                                        Click here to reset password
                                    </Link>
                                </div>
                            </div>
                        )}

                        <Link
                            href="/login"
                            className="block text-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
                        >
                            ← Back to login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-8">
                        {error && (
                            <div className="flex items-center gap-2 rounded-lg border border-red-800/50 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                    placeholder="you@company.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    Sending…
                                </span>
                            ) : "Send reset link"}
                        </button>
                    </form>
                )}

                <p className="text-center text-sm text-slate-400">
                    Remember your password?{" "}
                    <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition">
                        Sign in
                    </Link>
                </p>
            </div>
        </main>
    );
}
