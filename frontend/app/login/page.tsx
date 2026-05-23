'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

function LoginContent() {
  const [username, setUsername] = useState('sakshamaasvaa');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('admin');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';

  const shellStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f1f3d 0%, #1a2744 40%, #1e3a5f 100%)',
    position: 'relative',
    overflow: 'hidden',
    padding: '32px 20px',
  };

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: 20,
    padding: '38px 40px',
    width: '100%',
    maxWidth: 430,
    boxShadow: '0 24px 60px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2)',
    position: 'relative',
    zIndex: 10,
  };

  useEffect(() => {
    if (user?.user_type === 'admin') {
      router.replace('/');
    }
  }, [user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const ok = await login(username.trim(), password, userType);
    setIsSubmitting(false);

    if (ok) {
      router.replace(nextPath);
    } else {
      setError('Sign-in failed. Check username, password, and role.');
    }
  };

  return (
    <div className="auth-shell" style={shellStyle}>
      <div style={{ position: 'absolute', top: -120, right: -120, width: 400, height: 400, borderRadius: '50%', background: 'rgba(232, 93, 4, 0.06)', pointerEvents: 'none' }} />

      <div className="auth-card" style={cardStyle}>
        <div className="auth-brand" style={{ color: '#e85d04', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 20, height: 20, background: '#1a2744', borderRadius: 4, display: 'inline-block', flexShrink: 0 }} />
          Manthaan OS
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 2 }}>RITI Planning Intelligence</div>
        <h2 className="auth-title" style={{ fontSize: 28, fontWeight: 900, color: '#1a2744', lineHeight: 1.1, marginBottom: 8 }}>Secure Sign In</h2>
        <p className="auth-subtitle" style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #f1f5f9' }}>
          Access to dashboard, sectors, GIS, reports, and analytics is restricted to authorized admins.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="auth-field">
            <label className="auth-label" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 6, display: 'block' }}>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1a2744', background: '#f8fafc', transition: 'all 0.15s', outline: 'none' }}
              placeholder="username"
              autoComplete="username"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 6, display: 'block' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1a2744', background: '#f8fafc', transition: 'all 0.15s', outline: 'none' }}
              placeholder="password"
              autoComplete="current-password"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 6, display: 'block' }}>User Role</label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              className="auth-input"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#1a2744', background: '#f8fafc', transition: 'all 0.15s', outline: 'none' }}
            >
              <option value="admin">admin</option>
            </select>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-actions" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
            <button className="auth-submit" type="submit" disabled={isSubmitting} style={{ background: '#1a2744', color: '#ffffff', border: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.02em', width: '100%', boxShadow: '0 10px 20px rgba(26,39,68,0.14)' }}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
            <div className="auth-hint" style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>Session duration: 30 minutes</div>
            <div style={{ marginTop: 2, padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 6 }}>For this development env, these are the credentials</div>
              <div><span style={{ color: '#475569' }}>username:</span> <strong style={{ color: '#1a2744' }}>sakshamaasvaa</strong></div>
              <div><span style={{ color: '#475569' }}>password:</span> <strong style={{ color: '#1a2744' }}>Aasvaa@2026</strong></div>
              <div><span style={{ color: '#475569' }}>user_type:</span> <strong style={{ color: '#1a2744' }}>admin</strong></div>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        .auth-input:focus {
          border-color: #1e3a5f !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(30,58,95,0.08) !important;
        }

        .auth-submit:hover {
          background: #e85d04 !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(232,93,4,0.3);
        }

        .auth-submit:disabled {
          opacity: 0.7;
          cursor: wait;
          transform: none;
          box-shadow: none;
        }

        .auth-card {
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="auth-shell" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f1f3d 0%, #1a2744 40%, #1e3a5f 100%)', position: 'relative', overflow: 'hidden', padding: '32px 20px' }}>
        <div style={{ position: 'absolute', top: -120, right: -120, width: 400, height: 400, borderRadius: '50%', background: 'rgba(232, 93, 4, 0.06)', pointerEvents: 'none' }} />
        <div className="auth-card" style={{ background: '#ffffff', borderRadius: 20, padding: '38px 40px', width: '100%', maxWidth: 430, boxShadow: '0 24px 60px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2)', position: 'relative', zIndex: 10, margin: '0 auto' }}>
          <div style={{ color: '#e85d04', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 20, height: 20, background: '#1a2744', borderRadius: 4, display: 'inline-block', flexShrink: 0 }} />
            Manthaan OS
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 2 }}>RITI Planning Intelligence</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1a2744', lineHeight: 1.1, marginBottom: 8 }}>Loading...</h2>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
