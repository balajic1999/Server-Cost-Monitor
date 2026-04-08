"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            router.push("/dashboard");
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
                    <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
                    <p className="mt-2 text-sm text-slate-400">Sign in to your CloudPulse account</p>
                </div>

                {/* Form */}
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

                    <div>
                        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                            <input
                                id="password"
                                type={showPw ? "text" : "password"}
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-12 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                            >
                                {showPw ? (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                ) : (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Link href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                            Forgot password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Signing in…
                            </span>
                        ) : "Sign in"}
                    </button>
                </form>

                <p className="text-center text-sm text-slate-400">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="font-medium text-indigo-400 hover:text-indigo-300 transition">
                        Create one
                    </Link>
                </p>
            </div>
        </main>
    );
}
