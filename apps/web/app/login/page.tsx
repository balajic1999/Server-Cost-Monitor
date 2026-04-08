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
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--cp-bg-secondary)', padding: '48px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        {/* Logo + Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', background: 'var(--cp-accent)',
              borderRadius: '8px', marginBottom: '14px',
            }}>
              <svg width="18" height="18" fill="none"><path d="M2 13L9 6l7 7" stroke="var(--cp-accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </Link>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--cp-text-primary)', marginBottom: '4px' }}>Welcome back</h1>
          <p style={{ fontSize: '12px', color: 'var(--cp-text-tertiary)' }}>Sign in to your CloudPulse account</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} style={{
          background: 'var(--cp-bg-primary)', border: '1px solid var(--cp-border-primary)',
          borderRadius: '10px', padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '14px',
        }}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--cp-danger-bg)', border: '1px solid var(--cp-danger-border)',
              borderRadius: '6px', padding: '8px 12px', fontSize: '11px', color: 'var(--cp-danger)',
            }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><line x1="7" y1="5" x2="7" y2="8"/><circle cx="7" cy="9.5" r=".5" fill="currentColor"/></svg>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--cp-text-secondary)', display: 'block', marginBottom: '5px' }}>Email address</label>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" fill="none" stroke="var(--cp-text-muted)" strokeWidth="1.5" style={{ position: 'absolute', left: '10px', top: '9px' }}><rect x="1" y="3" width="12" height="9" rx="1.5"/><path d="M1 5l6 4 6-4" strokeLinecap="round"/></svg>
              <input
                id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cp-input" placeholder="you@company.com"
                style={{ paddingLeft: '30px' }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <label htmlFor="password" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--cp-text-secondary)' }}>Password</label>
              <Link href="/forgot-password" style={{ fontSize: '11px', color: 'var(--cp-info)', textDecoration: 'none' }}>Forgot password?</Link>
            </div>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" fill="none" stroke="var(--cp-text-muted)" strokeWidth="1.5" style={{ position: 'absolute', left: '10px', top: '9px' }}><rect x="2" y="6" width="10" height="7" rx="1"/><path d="M5 6V4a3 3 0 016 0v2" strokeLinecap="round"/></svg>
              <input
                id="password" type={showPw ? "text" : "password"} required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="cp-input" placeholder="••••••••"
                style={{ paddingLeft: '30px', paddingRight: '34px' }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: '10px', top: '9px', background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)', padding: 0,
              }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="7" cy="7" rx="6" ry="4"/><circle cx="7" cy="7" r="2"/></svg>
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="cp-btn" style={{ width: '100%', justifyContent: 'center', padding: '9px', fontSize: '13px', opacity: loading ? 0.6 : 1 }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                Signing in…
              </span>
            ) : "Sign in"}
          </button>

          <div style={{ textAlign: 'center' }}>
            <div className="cp-divider" style={{ margin: '4px 0' }} />
            <span style={{ fontSize: '11px', color: 'var(--cp-text-muted)' }}>or continue with</span>
            <div className="cp-divider" style={{ margin: '4px 0' }} />
          </div>

          <button type="button" className="cp-btn-outline" style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign in with Google
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--cp-text-tertiary)', marginTop: '16px' }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: 'var(--cp-text-primary)', fontWeight: 500, textDecoration: 'none' }}>Create one free</Link>
        </p>
      </div>
    </main>
  );
}
