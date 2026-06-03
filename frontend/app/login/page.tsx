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

  useEffect(() => {
    if (user?.user_type === 'admin' || user?.user_type === 'super_admin') {
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
    <div className="auth-container">
      <div className="left-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 44, height: 44, background: '#e85d04', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: 24, fontWeight: 900, borderRadius: 8 }}>M</div>
          <div>
            <div style={{ color: '#e85d04', fontSize: 13, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase' }}>MANTHAAN OS</div>
            <div style={{ color: '#ffffff', fontSize: 13, opacity: 0.7 }}>RITI Planning Intelligence</div>
          </div>
        </div>

        <div style={{ width: 48, height: 2, background: '#e85d04', margin: '32px 0' }} />

        <h1 style={{ color: '#ffffff', fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>Viksit Rajasthan @ 2047</h1>
        <p style={{ color: '#ffffff', fontSize: 14, opacity: 0.65, maxWidth: 280, lineHeight: 1.7, marginBottom: 32 }}>
          District planning intelligence platform for 41 Rajasthan districts across 11 development sectors.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff', fontSize: 13, opacity: 0.8 }}>
            <span style={{ color: '#e85d04' }}>•</span> 14,402 Gram Panchayats
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff', fontSize: 13, opacity: 0.8 }}>
            <span style={{ color: '#e85d04' }}>•</span> 10,245 Urban Wards
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff', fontSize: 13, opacity: 0.8 }}>
            <span style={{ color: '#e85d04' }}>•</span> 2.23M+ Planning Aspirations
          </div>
        </div>

        <div style={{ marginTop: 48 }}>
          <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.2)', marginBottom: 12 }} />
          <div style={{ color: '#ffffff', fontSize: 11, opacity: 0.45 }}>Aasvaa Innovation Labs</div>
        </div>
      </div>

      <div className="right-panel">
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2 style={{ color: '#1a2744', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Secure Sign In</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 32 }}>Access restricted to authorized administrators.</p>

          <form onSubmit={onSubmit}>
            <div className="auth-field">
              <label className="auth-label">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input"
                placeholder="username"
                autoComplete="username"
              />
            </div>

            <div className="auth-field" style={{ marginTop: 16 }}>
              <label className="auth-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                placeholder="password"
                autoComplete="current-password"
              />
            </div>

            <div className="auth-field" style={{ marginTop: 16 }}>
              <label className="auth-label">User Role</label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="auth-input"
              >
                <option value="admin">admin</option>
                <option value="super_admin">super_admin</option>
              </select>
            </div>

            {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 16 }}>{error}</div>}

            <div style={{ marginTop: 24 }}>
              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
              <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 12 }}>Session duration: 30 minutes</div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '14px 16px', marginTop: 20 }}>
              <div style={{ color: '#92400e', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginBottom: 8 }}>DEVELOPMENT CREDENTIALS</div>
              <div style={{ color: '#374151', fontSize: 13, lineHeight: 1.6 }}>
                <div><span style={{ opacity: 0.7 }}>username:</span> <strong style={{ fontFamily: 'monospace' }}>sakshamaasvaa</strong></div>
                <div><span style={{ opacity: 0.7 }}>password:</span> <strong style={{ fontFamily: 'monospace' }}>Aasvaa@2026</strong></div>
                <div><span style={{ opacity: 0.7 }}>user_type:</span> <strong style={{ fontFamily: 'monospace' }}>admin</strong> or <strong style={{ fontFamily: 'monospace' }}>super_admin</strong></div>
              </div>
              <div style={{ marginTop: 10, padding: '6px 8px', background: '#e85d04', borderRadius: 6, color: '#ffffff', fontSize: 11, fontWeight: 600 }}>
                ⚠️ <strong>super_admin</strong> role required to access the Backend Portal
              </div>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .auth-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }
        .left-panel {
          width: 50%;
          height: 100vh;
          background: #1a2744;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          padding: 48px;
          position: relative;
        }
        .right-panel {
          width: 50%;
          height: 100vh;
          background: #ffffff;
          overflow-y: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
        }

        .auth-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #374151;
          margin-bottom: 6px;
          display: block;
        }

        .auth-input {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #1a2744;
          outline: none;
          transition: all 0.2s;
        }
        .auth-input:focus {
          border-color: #1a2744;
          box-shadow: 0 0 0 3px rgba(26,39,68,0.08);
        }

        .auth-submit {
          width: 100%;
          background: #1a2744;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          padding: 13px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .auth-submit:hover:not(:disabled) {
          background: #e85d04;
        }
        .auth-submit:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        @media (max-width: 768px) {
          .auth-container {
            flex-direction: column;
            overflow: auto;
          }
          .left-panel {
            width: 100%;
            height: auto;
            min-height: 180px;
            padding: 32px 24px;
            overflow-y: visible;
          }
          .right-panel {
            width: 100%;
            height: auto;
            padding: 32px 24px;
            overflow-y: visible;
          }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#1a2744', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
        Loading...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
