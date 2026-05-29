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
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
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
            <span className="font-serif text-lg font-medium text-foreground">CloudPulse</span>
          </Link>
          <h1 className="mt-6 font-serif text-3xl font-medium tracking-tight text-foreground">Reset password</h1>
          <p className="mt-1 text-sm text-muted-foreground">We&apos;ll email a link if the account exists.</p>
        </div>

        {success ? (
          <div className="space-y-4 rounded-lg border border-border bg-surface p-8 shadow-sm">
            <p className="text-sm text-foreground">If that email is registered, check your inbox.</p>
            {resetToken && (
              <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
                Dev token:{" "}
                <Link href={`/reset-password?token=${resetToken}`} className="font-mono text-accent underline">
                  reset link
                </Link>
              </div>
            )}
            <Link href="/login" className="block text-center text-sm text-accent hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-surface p-8 shadow-sm">
            {error && <div className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</div>}
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input id="email" className={inputClass} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
              {loading ? "Sending…" : "Send link"}
            </button>
            <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
