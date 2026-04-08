"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
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
      await register(email, password, name);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const pwStrength = password.length === 0 ? -1 : password.length < 8 ? 0 : password.length < 12 ? 1 : 2;
  const pwColors = ["var(--cp-danger)", "var(--cp-warning)", "var(--cp-success)"];
  const pwLabels = ["Weak password", "Good password", "Strong password"];

  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--cp-bg-secondary)', padding: '48px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo + Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', background: 'var(--cp-accent)',
              borderRadius: '8px', marginBottom: '14px',
            }}>
              <svg width="18" height="18" fill="none"><path d="M2 13L9 6l7 7" stroke="var(--cp-accent-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </Link>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--cp-text-primary)', marginBottom: '4px' }}>Create your account</h1>
          <p style={{ fontSize: '12px', color: 'var(--cp-text-tertiary)' }}>Start monitoring cloud costs for free</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} style={{
          background: 'var(--cp-bg-primary)', border: '1px solid var(--cp-border-primary)',
          borderRadius: '10px', padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '13px',
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
            <label htmlFor="name" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--cp-text-secondary)', display: 'block', marginBottom: '5px' }}>Full name</label>
            <input
              id="name" type="text" required minLength={2} value={name}
              onChange={(e) => setName(e.target.value)}
              className="cp-input" placeholder="Jane Doe"
            />
          </div>

          <div>
            <label htmlFor="email" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--cp-text-secondary)', display: 'block', marginBottom: '5px' }}>Work email</label>
            <input
              id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="cp-input" placeholder="jane@acme.io"
            />
          </div>

          <div>
            <label htmlFor="password" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--cp-text-secondary)', display: 'block', marginBottom: '5px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password" type={showPw ? "text" : "password"} required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="cp-input" placeholder="Min. 8 characters"
                style={{ paddingRight: '34px' }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: '10px', top: '9px', background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)', padding: 0,
              }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="7" cy="7" rx="6" ry="4"/><circle cx="7" cy="7" r="2"/></svg>
              </button>
            </div>
            {/* Password strength */}
            {password.length > 0 && (
              <div style={{ marginTop: '7px' }}>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '4px' }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{
                      flex: 1, height: '3px', borderRadius: '2px',
                      background: i <= pwStrength ? pwColors[pwStrength] : 'var(--cp-border-primary)',
                      transition: 'background 200ms ease',
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: '10px', color: pwColors[pwStrength], fontWeight: 500 }}>{pwLabels[pwStrength] ?? "Too short"}</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
            <input type="checkbox" required style={{ width: '13px', height: '13px', marginTop: '1px', accentColor: 'var(--cp-accent)' }} />
            <span style={{ fontSize: '11px', color: 'var(--cp-text-tertiary)', lineHeight: 1.6 }}>
              I agree to the <a href="#" style={{ color: 'var(--cp-text-primary)', fontWeight: 500, textDecoration: 'none' }}>Terms of Service</a> and <a href="#" style={{ color: 'var(--cp-text-primary)', fontWeight: 500, textDecoration: 'none' }}>Privacy Policy</a>
            </span>
          </div>

          <button type="submit" disabled={loading} className="cp-btn" style={{ width: '100%', justifyContent: 'center', padding: '9px', fontSize: '13px', opacity: loading ? 0.6 : 1 }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                Creating account…
              </span>
            ) : "Create account"}
          </button>

          <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--cp-text-muted)', marginTop: '2px' }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: 'var(--cp-text-primary)', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
