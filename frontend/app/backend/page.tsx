"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Backend Portal Gate
 *
 * Only users who logged in with user_type = 'super_admin' may access
 * /backend/index.html. Everyone else is redirected to /login.
 *
 * Two layers of protection:
 *  1. This page checks localStorage before redirecting (client-side gate).
 *  2. backend/index.html performs its own token check on load (second layer).
 */
export default function BackendPortalPage() {
  const router = useRouter();

  useEffect(() => {
    let session: { user?: { user_type?: string }; expiresAt?: string } | null = null;

    try {
      const raw = localStorage.getItem('riti_auth_session');
      if (raw) session = JSON.parse(raw);
    } catch {
      // ignore parse errors
    }

    const isValid =
      session?.user?.user_type === 'super_admin' &&
      session?.expiresAt &&
      Date.now() < new Date(session.expiresAt).getTime();

    if (isValid) {
      // Write a short-lived access token into sessionStorage so that
      // backend/index.html can verify this was a legitimate redirect.
      try {
        const token = btoa(`super_admin:${session!.expiresAt}`);
        sessionStorage.setItem('riti_backend_token', token);
      } catch {
        // ignore
      }
      window.location.replace('/backend/index.html');
    } else {
      // Not authenticated or wrong role — send to login, return here after
      router.replace('/login?next=/backend');
    }
  }, [router]);

  return (
    <div style={{ padding: '2rem', color: 'var(--t1)' }}>
      <p>Checking access...</p>
    </div>
  );
}
