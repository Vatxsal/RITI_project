'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
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
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">RITI Planning Intelligence</div>
        <h2 className="auth-title">Secure Sign In</h2>
        <p className="auth-subtitle">
          Access to dashboard, sectors, GIS, reports, and analytics is restricted to authorized admins.
        </p>

        <form onSubmit={onSubmit} className="space-y-4 mt-5">
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

          <div className="auth-field">
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

          <div className="auth-field">
            <label className="auth-label">User Role</label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              className="auth-input"
            >
              <option value="admin">admin</option>
            </select>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-actions">
            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
            <div className="auth-hint">Session duration: 30 minutes</div>
          </div>
        </form>

        <div className="auth-credentials">
          Login credentials for this environment:
          <div>username: <strong>sakshamaasvaa</strong></div>
          <div>password: <strong>Aasvaa@2026</strong></div>
          <div>user_type: <strong>admin</strong></div>
        </div>
      </div>
    </div>
  );
}
