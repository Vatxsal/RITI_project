'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type User = {
  username: string;
  user_type: string;
};

type AuthSession = {
  user: User;
  expiresAt: string;
};

type AuthContextType = {
  user: User | null;
  isInitializing: boolean;
  sessionExpiresAt: string | null;
  login: (username: string, password: string, userType?: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isInitializing: true,
  sessionExpiresAt: null,
  login: async () => false,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const clearSession = () => {
    setUser(null);
    setSessionExpiresAt(null);
    try {
      localStorage.removeItem('riti_auth_session');
    } catch {
      // ignore
    }
  };

  const isExpired = (expiresAt: string) => Date.now() >= new Date(expiresAt).getTime();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('riti_auth_session');
      if (raw) {
        const parsed = JSON.parse(raw) as AuthSession;
        if (parsed?.user && parsed?.expiresAt && !isExpired(parsed.expiresAt)) {
          setUser(parsed.user);
          setSessionExpiresAt(parsed.expiresAt);
        } else {
          clearSession();
        }
      }
    } catch {
      // ignore
      clearSession();
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionExpiresAt) return;

    const timer = window.setInterval(() => {
      if (isExpired(sessionExpiresAt)) {
        clearSession();
      }
    }, 15000);

    return () => window.clearInterval(timer);
  }, [sessionExpiresAt]);

  const login = async (username: string, password: string, userType = 'admin') => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, user_type: userType }),
    });

    if (!res.ok) {
      return false;
    }

    const data = await res.json();
    const nextUser: User = data.user;
    const expiresAt: string = data.expiresAt;

    const nextSession: AuthSession = { user: nextUser, expiresAt };
    setUser(nextUser);
    setSessionExpiresAt(expiresAt);
    try {
      localStorage.setItem('riti_auth_session', JSON.stringify(nextSession));
    } catch {
      // ignore
    }
    return true;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    } finally {
      clearSession();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isInitializing, sessionExpiresAt, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
