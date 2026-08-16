import { useCallback, useEffect, useState } from 'react';
import {
  fetchAuthenticatedEmail,
  requestSignIn,
  requestSilentToken,
  signOut as revokeGoogleSession,
} from '@/lib/auth/google-identity';

const CACHE_KEY = 'kiplog-auth-cache';

interface AuthCache {
  email: string;
  verifiedAt: string;
}

function readCache(): AuthCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as AuthCache) : null;
  } catch {
    return null;
  }
}

function writeCache(email: string): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ email, verifiedAt: new Date().toISOString() }));
}

function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

export type AuthStatus = 'loading' | 'signed-out' | 'unauthorized' | 'signed-in';

interface AuthState {
  status: AuthStatus;
  email: string | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

// Comma-separated so more than one Google account can be trusted (e.g. a
// personal + work account) — each one must ALSO be added as a test user in
// the Google Cloud OAuth consent screen, or Google rejects it before this
// check ever runs (see docs/ASSUMPTIONS.md).
const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAIL ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAllowed(email: string): boolean {
  return allowedEmails.includes(email.toLowerCase());
}

// Gate identity: only an email in `allowedEmails` may ever reach
// `signed-in`. A cached verification lets the app open offline after the
// first real login (see docs/ASSUMPTIONS.md) — a live Google round-trip on
// every open would lock the user out of their own offline data, which
// defeats the point of this being an offline-first app.
export function useAuth(): AuthState {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (allowedEmails.length === 0) {
        // Misconfiguration — fail closed, not open.
        if (!cancelled) setStatus('unauthorized');
        return;
      }

      const cache = readCache();
      if (cache && isAllowed(cache.email)) {
        if (!cancelled) {
          setEmail(cache.email);
          setStatus('signed-in');
        }
        // Best-effort background token refresh for sync — never blocks or
        // signs the user out if it fails (e.g. offline).
        void requestSilentToken();
        return;
      }

      // No local cache (new device/browser) — try a silent token in case
      // this browser already has a granted Google session, before falling
      // back to showing the interactive login screen.
      const token = await requestSilentToken();
      if (cancelled) return;
      if (!token) {
        setStatus('signed-out');
        return;
      }
      try {
        const verifiedEmail = await fetchAuthenticatedEmail(token);
        if (cancelled) return;
        if (isAllowed(verifiedEmail)) {
          writeCache(verifiedEmail);
          setEmail(verifiedEmail);
          setStatus('signed-in');
        } else {
          setEmail(verifiedEmail);
          setStatus('unauthorized');
        }
      } catch {
        if (!cancelled) setStatus('signed-out');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const token = await requestSignIn();
      const verifiedEmail = await fetchAuthenticatedEmail(token);
      if (isAllowed(verifiedEmail)) {
        writeCache(verifiedEmail);
        setEmail(verifiedEmail);
        setStatus('signed-in');
      } else {
        revokeGoogleSession();
        setEmail(verifiedEmail);
        setStatus('unauthorized');
      }
    } catch (err) {
      setError((err as Error).message);
      setStatus('signed-out');
    }
  }, []);

  const signOut = useCallback(() => {
    revokeGoogleSession();
    clearCache();
    setEmail(null);
    setError(null);
    setStatus('signed-out');
  }, []);

  return { status, email, error, signIn, signOut };
}
