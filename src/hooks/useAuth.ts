import { useEffect } from 'react';
import { create } from 'zustand';
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

interface AuthStoreState {
  status: AuthStatus;
  email: string | null;
  error: string | null;
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

// Shared singleton store — the bootstrap flow (including the background
// silent-token refresh, which briefly tries to open a hidden Google popup)
// must run exactly ONCE per app load, not once per component that reads
// auth state. Every page that calls useAuth() (RequireAuth at the root,
// SyncStatusCard in Pengaturan, etc.) shares this same store instead of
// each re-running its own copy of the bootstrap effect — that duplication
// was the cause of a popup re-triggering on every visit to Pengaturan.
const useAuthStore = create<AuthStoreState>(() => ({
  status: 'loading',
  email: null,
  error: null,
}));

let bootstrapped = false;

async function bootstrap(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  if (allowedEmails.length === 0) {
    // Misconfiguration — fail closed, not open.
    useAuthStore.setState({ status: 'unauthorized' });
    return;
  }

  const cache = readCache();
  if (cache && isAllowed(cache.email)) {
    useAuthStore.setState({ email: cache.email, status: 'signed-in' });
    // Best-effort background token refresh for sync — never blocks or
    // signs the user out if it fails (e.g. offline).
    void requestSilentToken();
    return;
  }

  // No local cache (new device/browser) — try a silent token in case this
  // browser already has a granted Google session, before falling back to
  // showing the interactive login screen.
  const token = await requestSilentToken();
  if (!token) {
    useAuthStore.setState({ status: 'signed-out' });
    return;
  }
  try {
    const verifiedEmail = await fetchAuthenticatedEmail(token);
    if (isAllowed(verifiedEmail)) {
      writeCache(verifiedEmail);
      useAuthStore.setState({ email: verifiedEmail, status: 'signed-in' });
    } else {
      useAuthStore.setState({ email: verifiedEmail, status: 'unauthorized' });
    }
  } catch {
    useAuthStore.setState({ status: 'signed-out' });
  }
}

async function signIn(): Promise<void> {
  useAuthStore.setState({ status: 'loading', error: null });
  try {
    const token = await requestSignIn();
    const verifiedEmail = await fetchAuthenticatedEmail(token);
    if (isAllowed(verifiedEmail)) {
      writeCache(verifiedEmail);
      useAuthStore.setState({ email: verifiedEmail, status: 'signed-in' });
    } else {
      revokeGoogleSession();
      useAuthStore.setState({ email: verifiedEmail, status: 'unauthorized' });
    }
  } catch (err) {
    useAuthStore.setState({ error: (err as Error).message, status: 'signed-out' });
  }
}

function signOut(): void {
  revokeGoogleSession();
  clearCache();
  useAuthStore.setState({ email: null, error: null, status: 'signed-out' });
}

interface AuthState extends AuthStoreState {
  signIn: () => Promise<void>;
  signOut: () => void;
}

// Gate identity: only an email in `allowedEmails` may ever reach
// `signed-in`. A cached verification lets the app open offline after the
// first real login (see docs/ASSUMPTIONS.md) — a live Google round-trip on
// every open would lock the user out of their own offline data, which
// defeats the point of this being an offline-first app.
export function useAuth(): AuthState {
  const state = useAuthStore();

  useEffect(() => {
    void bootstrap();
  }, []);

  return { ...state, signIn, signOut };
}
