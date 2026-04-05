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
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="text-sm font-semibold text-zinc-900">
            CloudPulse
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-zinc-900">New password</h1>
        </div>

        {success ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-700 shadow-sm">
            Saved. Redirecting to login…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
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
            <Link href="/login" className="block text-center text-sm text-blue-600 hover:underline">
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
        <main className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600" />
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
