"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import {
  updateProfile,
  changePassword,
  getSubscription,
  createCheckoutSession,
  createPortalSession,
  type Subscription,
} from "../../../lib/api";
import { btnPrimary, btnSecondary, cardClass, inputClass, labelClass } from "../../../lib/ui";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [budgetWarnings, setBudgetWarnings] = useState(true);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    getSubscription()
      .then(setSubscription)
      .catch(() =>
        setSubscription({ plan: "FREE", status: "ACTIVE", currentPeriodEnd: null, hasStripeSubscription: false })
      )
      .finally(() => setSubLoading(false));
  }, []);

  async function handleProfile(e: FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await updateProfile({ name, email });
      addToast("success", "Profile updated.");
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      addToast("error", "Passwords do not match.");
      return;
    }
    setPwLoading(true);
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw });
      addToast("success", "Password updated.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setPwLoading(false);
    }
  }

  async function upgrade() {
    setActionLoading(true);
    try {
      const { url } = await createCheckoutSession();
      if (url) window.location.href = url;
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  async function portal() {
    setActionLoading(true);
    try {
      const { url } = await createPortalSession();
      if (url) window.location.href = url;
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  const plan = subscription?.plan ?? "FREE";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Account, plan, notifications, and security.</p>
      </div>

      <section id="plan" className={cardClass}>
        <h2 className="text-sm font-medium text-zinc-900">Plan</h2>
        <p className="mt-1 text-xs text-zinc-500">Upgrade for more projects and accounts.</p>
        {subLoading ? (
          <div className="mt-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600" />
        ) : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900">{plan === "PRO" ? "Pro" : "Free"}</p>
              <p className="text-xs text-zinc-500">
                {subscription?.currentPeriodEnd
                  ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : " "}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {plan === "FREE" ? (
                <button type="button" onClick={upgrade} disabled={actionLoading} className={btnPrimary}>
                  {actionLoading ? "…" : "Upgrade"}
                </button>
              ) : null}
              {subscription?.hasStripeSubscription ? (
                <button type="button" onClick={portal} disabled={actionLoading} className={btnSecondary}>
                  Billing portal
                </button>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className={cardClass}>
        <h2 className="text-sm font-medium text-zinc-900">Cloud credentials</h2>
        <p className="mt-1 text-xs text-zinc-500">Add or rotate keys from the connect flow.</p>
        <Link href="/dashboard/connect" className={`${btnSecondary} mt-4 inline-flex`}>
          Manage connections
        </Link>
      </section>

      <section className={cardClass}>
        <h2 className="text-sm font-medium text-zinc-900">Budgets</h2>
        <p className="mt-1 text-xs text-zinc-500">Set monthly caps per project.</p>
        <Link href="/dashboard/projects" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          Open projects →
        </Link>
      </section>

      <section className={cardClass}>
        <h2 className="text-sm font-medium text-zinc-900">Notifications</h2>
        <p className="mt-1 text-xs text-zinc-500">Preferences are stored locally for now.</p>
        <div className="mt-4 space-y-3">
          <Toggle label="Email alerts" checked={emailAlerts} onChange={setEmailAlerts} />
          <Toggle label="Budget warnings" checked={budgetWarnings} onChange={setBudgetWarnings} />
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-sm font-medium text-zinc-900">Profile</h2>
        <form onSubmit={handleProfile} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sn" className={labelClass}>
                Name
              </label>
              <input id="sn" className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="se" className={labelClass}>
                Email
              </label>
              <input id="se" className={inputClass} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <button type="submit" disabled={profileLoading} className={btnPrimary}>
            {profileLoading ? "Saving…" : "Save"}
          </button>
        </form>
      </section>

      <section className={cardClass}>
        <h2 className="text-sm font-medium text-zinc-900">Password</h2>
        <form onSubmit={handlePassword} className="mt-4 space-y-3">
          <div>
            <label className={labelClass}>Current</label>
            <input className={inputClass} type="password" required value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>New</label>
              <input className={inputClass} type="password" required minLength={8} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Confirm</label>
              <input
                className={inputClass}
                type="password"
                required
                minLength={8}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" disabled={pwLoading} className={btnPrimary}>
            {pwLoading ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>

      <section className={cardClass}>
        <h2 className="text-sm font-medium text-zinc-900">Session</h2>
        <button type="button" onClick={() => logout()} className={`${btnSecondary} mt-3`}>
          Sign out
        </button>
      </section>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-zinc-200"}`}
      >
        <span
          className={`ml-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}
