"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { forgotPassword } from "../../lib/api";
import { btnPrimary, inputClass, labelClass } from "../../lib/ui";

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
      if (result.resetToken) setResetToken(result.resetToken);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="text-sm font-semibold text-zinc-900">
            CloudPulse
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-zinc-900">Reset password</h1>
          <p className="mt-1 text-sm text-zinc-500">We&apos;ll email a link if the account exists.</p>
        </div>

        {success ? (
          <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-zinc-700">If that email is registered, check your inbox.</p>
            {resetToken && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Dev token:{" "}
                <Link href={`/reset-password?token=${resetToken}`} className="font-mono text-blue-600 underline">
                  reset link
                </Link>
              </div>
            )}
            <Link href="/login" className="block text-center text-sm text-blue-600 hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input id="email" className={inputClass} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
              {loading ? "Sending…" : "Send link"}
            </button>
            <Link href="/login" className="block text-center text-sm text-zinc-500 hover:text-zinc-800">
              Cancel
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
