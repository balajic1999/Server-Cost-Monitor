"use client";

import { useEffect, useState, FormEvent } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { updateProfile, changePassword } from "../../../lib/api";

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

    // Notification preferences (local state — could be API-backed later)
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [weeklyDigest, setWeeklyDigest] = useState(false);
    const [budgetWarnings, setBudgetWarnings] = useState(true);

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
        }
    }, [user]);

    async function handleProfileUpdate(e: FormEvent) {
        e.preventDefault();

        setProfileLoading(true);
        try {
            await updateProfile({ name, email });
            addToast("success", "Profile updated successfully");
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setProfileLoading(false);
        }
    }

    async function handlePasswordChange(e: FormEvent) {
        e.preventDefault();


        if (newPw !== confirmPw) {
            addToast("error", "Passwords do not match");
            return;
        }

        setPwLoading(true);
        try {
            await changePassword({ currentPassword: currentPw, newPassword: newPw });
            addToast("success", "Password changed successfully");
            setCurrentPw("");
            setNewPw("");
            setConfirmPw("");
        } catch (err) {
            addToast("error", (err as Error).message);
        } finally {
            setPwLoading(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="mt-1 text-sm text-slate-400">Manage your account and preferences</p>
            </div>

            {/* Profile Section */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    Profile
                </h2>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="settings-name" className="mb-1.5 block text-sm font-medium text-slate-300">Name</label>
                            <input
                                id="settings-name"
                                type="text"
                                required
                                minLength={2}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                        </div>
                        <div>
                            <label htmlFor="settings-email" className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
                            <input
                                id="settings-email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={profileLoading}
                            className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
                        >
                            {profileLoading ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </section>

            {/* Notification Preferences */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    Notification Preferences
                </h2>

                <div className="space-y-4">
                    <ToggleRow
                        label="Email Alerts"
                        description="Receive email notifications when alert rules are triggered"
                        checked={emailAlerts}
                        onChange={(v) => { setEmailAlerts(v); addToast("info", `Email alerts ${v ? "enabled" : "disabled"}`); }}
                    />
                    <ToggleRow
                        label="Budget Warnings"
                        description="Get notified when spending approaches 80% of your budget"
                        checked={budgetWarnings}
                        onChange={(v) => { setBudgetWarnings(v); addToast("info", `Budget warnings ${v ? "enabled" : "disabled"}`); }}
                    />
                    <ToggleRow
                        label="Weekly Digest"
                        description="Receive a weekly summary of your cloud spending every Monday"
                        checked={weeklyDigest}
                        onChange={(v) => { setWeeklyDigest(v); addToast("info", `Weekly digest ${v ? "enabled" : "disabled"}`); }}
                    />
                </div>
            </section>

            {/* Password Section */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Security
                </h2>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label htmlFor="current-pw" className="mb-1.5 block text-sm font-medium text-slate-300">Current Password</label>
                        <input id="current-pw" type="password" required value={currentPw}
                            onChange={(e) => setCurrentPw(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="new-pw" className="mb-1.5 block text-sm font-medium text-slate-300">New Password</label>
                            <input id="new-pw" type="password" required minLength={8} value={newPw}
                                onChange={(e) => setNewPw(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-pw" className="mb-1.5 block text-sm font-medium text-slate-300">Confirm Password</label>
                            <input id="confirm-pw" type="password" required minLength={8} value={confirmPw}
                                onChange={(e) => setConfirmPw(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button type="submit" disabled={pwLoading}
                            className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
                        >
                            {pwLoading ? "Changing…" : "Change Password"}
                        </button>
                    </div>
                </form>
            </section>

            {/* Account Info + Danger Zone */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    Account
                </h2>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-slate-800">
                        <span className="text-slate-400">User ID</span>
                        <span className="text-slate-300 font-mono text-xs bg-slate-800 rounded px-2 py-1">{user?.id}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-800">
                        <span className="text-slate-400">Member since</span>
                        <span className="text-slate-300">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-slate-400">Session</span>
                        <button
                            onClick={logout}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500/50 hover:text-red-400 hover:bg-red-950/30"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                            Sign Out
                        </button>
                    </div>
                </div>
            </section>

            {/* Danger Zone */}
            <section className="rounded-2xl border border-red-900/30 bg-red-950/10 p-6">
                <h2 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    Danger Zone
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                    Once you delete your account, there is no going back. All projects, cost data, and alert rules will be permanently removed.
                </p>
                <button
                    onClick={() => addToast("warning", "Account deletion is not available yet. Contact support.")}
                    className="rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-900/40 hover:border-red-700/50"
                >
                    Delete Account
                </button>
            </section>
        </div>
    );
}

/* ─── Toggle Row Component ───────────────────────────────── */

function ToggleRow({ label, description, checked, onChange }: {
    label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between py-2">
            <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-slate-700"
                    }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"
                        }`}
                />
            </button>
        </div>
    );
}
