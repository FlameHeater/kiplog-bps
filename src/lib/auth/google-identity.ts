// Thin wrapper around Google Identity Services (GIS) — the only
// third-party network dependency in this app, added deliberately at the
// user's request (see docs/ASSUMPTIONS.md) to gate the app behind their own
// Google account and let Drive act as the cross-device sync backend.
//
// Uses the OAuth2 token client (implicit, no server/redirect needed) with
// the `drive.appdata` scope only — a "non-sensitive" scope, so the OAuth
// consent screen never needs Google's app-verification review as long as
// the app stays in "Testing" publish status with the user's email as the
// sole test user (see setup instructions given separately).

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

interface TokenResponse {
  access_token: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type: string }) => void;
          }) => TokenClient;
          revoke: (accessToken: string, callback?: () => void) => void;
        };
      };
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat layanan login Google.'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

let tokenClient: TokenClient | null = null;
let currentAccessToken: string | null = null;

async function getTokenClient(): Promise<TokenClient> {
  await loadGisScript();
  if (tokenClient) return tokenClient;

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID belum diatur — lihat .env.example.');
  }

  tokenClient = window.google!.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: DRIVE_SCOPE,
    callback: () => {}, // overridden per-call in requestAccessToken()
  });
  return tokenClient;
}

/** Interactive sign-in (shows Google's consent popup). */
export async function requestSignIn(): Promise<string> {
  const client = await getTokenClient();
  return new Promise((resolve, reject) => {
    window.google!.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error('Login Google dibatalkan atau gagal.'));
          return;
        }
        currentAccessToken = response.access_token;
        resolve(response.access_token);
      },
      error_callback: () => reject(new Error('Login Google dibatalkan atau gagal.')),
    }).requestAccessToken({ prompt: 'select_account' });
    void client; // keep the cached client warm for silent refresh calls
  });
}

/** Silent re-auth — succeeds only if the browser already has a granted session; never shows UI. */
export async function requestSilentToken(): Promise<string | null> {
  try {
    const client = await getTokenClient();
    return await new Promise((resolve) => {
      window.google!.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (response.error || !response.access_token) {
            resolve(null);
            return;
          }
          currentAccessToken = response.access_token;
          resolve(response.access_token);
        },
        error_callback: () => resolve(null),
      }).requestAccessToken({ prompt: '' });
      void client;
    });
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function signOut(): void {
  if (currentAccessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(currentAccessToken, () => {});
  }
  currentAccessToken = null;
}

/** Resolves the email of whoever the access token actually belongs to — Google-verified, can't be spoofed client-side. */
export async function fetchAuthenticatedEmail(accessToken: string): Promise<string> {
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error('Gagal memverifikasi akun Google.');
  const data = (await res.json()) as { email?: string };
  if (!data.email) throw new Error('Akun Google ini tidak memiliki email.');
  return data.email;
}
