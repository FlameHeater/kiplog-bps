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
  signIn: () => Promise<void>;
  signOut: () => void;
}

const allowedEmail = (import.meta.env.VITE_ALLOWED_EMAIL ?? '').toLowerCase();

// Gate identity: only `allowedEmail` may ever reach `signed-in`. A cached
// verification lets the app open offline after the first real login (see
// docs/ASSUMPTIONS.md) — a live Google round-trip on every open would lock
// the user out of their own offline data, which defeats the point of this
// being an offline-first app.
export function useAuth(): AuthState {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!allowedEmail) {
        // Misconfiguration — fail closed, not open.
        if (!cancelled) setStatus('unauthorized');
        return;
      }

      const cache = readCache();
      if (cache && cache.email.toLowerCase() === allowedEmail) {
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
        if (verifiedEmail.toLowerCase() === allowedEmail) {
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
    try {
      const token = await requestSignIn();
      const verifiedEmail = await fetchAuthenticatedEmail(token);
      if (verifiedEmail.toLowerCase() === allowedEmail) {
        writeCache(verifiedEmail);
        setEmail(verifiedEmail);
        setStatus('signed-in');
      } else {
        revokeGoogleSession();
        setEmail(verifiedEmail);
        setStatus('unauthorized');
      }
    } catch {
      setStatus('signed-out');
    }
  }, []);

  const signOut = useCallback(() => {
    revokeGoogleSession();
    clearCache();
    setEmail(null);
    setStatus('signed-out');
  }, []);

  return { status, email, signIn, signOut };
}
