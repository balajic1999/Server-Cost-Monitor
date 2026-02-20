"use client";

import { useEffect, useState, FormEvent } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { updateProfile, changePassword } from "../../../lib/api";

export default function SettingsPage() {
    const { user, token } = useAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [profileMsg, setProfileMsg] = useState("");
    const [profileErr, setProfileErr] = useState("");
    const [profileLoading, setProfileLoading] = useState(false);

    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [pwMsg, setPwMsg] = useState("");
    const [pwErr, setPwErr] = useState("");
    const [pwLoading, setPwLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
        }
    }, [user]);

    async function handleProfileUpdate(e: FormEvent) {
        e.preventDefault();
        if (!token) return;
        setProfileMsg("");
        setProfileErr("");
        setProfileLoading(true);
        try {
            await updateProfile(token, { name, email });
            setProfileMsg("Profile updated successfully");
        } catch (err) {
            setProfileErr((err as Error).message);
        } finally {
            setProfileLoading(false);
        }
    }

    async function handlePasswordChange(e: FormEvent) {
        e.preventDefault();
        if (!token) return;
        setPwMsg("");
        setPwErr("");

        if (newPw !== confirmPw) {
            setPwErr("Passwords do not match");
            return;
        }

        setPwLoading(true);
        try {
            await changePassword(token, { currentPassword: currentPw, newPassword: newPw });
            setPwMsg("Password changed successfully");
            setCurrentPw("");
            setNewPw("");
            setConfirmPw("");
        } catch (err) {
            setPwErr((err as Error).message);
        } finally {
            setPwLoading(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                <p className="text-slate-400">Manage your account and preferences</p>
            </div>

            {/* Profile Section */}
            <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    {profileMsg && (
                        <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
                            ✓ {profileMsg}
                        </div>
                    )}
                    {profileErr && (
                        <div className="rounded-lg border border-red-800/50 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                            {profileErr}
                        </div>
                    )}

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

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={profileLoading}
                            className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
                        >
                            {profileLoading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </section>

            {/* Password Section */}
            <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    {pwMsg && (
                        <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
                            ✓ {pwMsg}
                        </div>
                    )}
                    {pwErr && (
                        <div className="rounded-lg border border-red-800/50 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                            {pwErr}
                        </div>
                    )}

                    <div>
                        <label htmlFor="current-pw" className="mb-1.5 block text-sm font-medium text-slate-300">Current Password</label>
                        <input
                            id="current-pw"
                            type="password"
                            required
                            value={currentPw}
                            onChange={(e) => setCurrentPw(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                    </div>

                    <div>
                        <label htmlFor="new-pw" className="mb-1.5 block text-sm font-medium text-slate-300">New Password</label>
                        <input
                            id="new-pw"
                            type="password"
                            required
                            minLength={8}
                            value={newPw}
                            onChange={(e) => setNewPw(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirm-pw" className="mb-1.5 block text-sm font-medium text-slate-300">Confirm New Password</label>
                        <input
                            id="confirm-pw"
                            type="password"
                            required
                            minLength={8}
                            value={confirmPw}
                            onChange={(e) => setConfirmPw(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={pwLoading}
                            className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
                        >
                            {pwLoading ? "Changing..." : "Change Password"}
                        </button>
                    </div>
                </form>
            </section>

            {/* Account Info */}
            <section className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Account</h2>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-400">User ID</span>
                        <span className="text-slate-300 font-mono text-xs">{user?.id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Member since</span>
                        <span className="text-slate-300">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</span>
                    </div>
                </div>
            </section>
        </div>
    );
}
