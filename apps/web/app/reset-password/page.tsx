"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPasswordApi } from "../../lib/api";
import { btnPrimary, inputClass, labelClass } from "../../lib/ui";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("At least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordApi(token, newPassword);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
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
          <h1 className="mt-6 font-serif text-3xl font-medium tracking-tight text-foreground">New password</h1>
        </div>

        {success ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-foreground shadow-sm">
            Saved. Redirecting to login…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-surface p-8 shadow-sm">
            {error && <div className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</div>}
            {!tokenFromUrl && (
              <div>
                <label htmlFor="token" className={labelClass}>
                  Reset token
                </label>
                <input id="token" className={`${inputClass} font-mono text-xs`} required value={token} onChange={(e) => setToken(e.target.value)} />
              </div>
            )}
            <div>
              <label htmlFor="np" className={labelClass}>
                New password
              </label>
              <input
                id="np"
                className={inputClass}
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cp" className={labelClass}>
                Confirm
              </label>
              <input
                id="cp"
                className={inputClass}
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
              {loading ? "Saving…" : "Save password"}
            </button>
            <Link href="/login" className="block text-center text-sm text-accent hover:underline">
              Sign in
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
