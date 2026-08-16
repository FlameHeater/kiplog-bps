/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Google OAuth Web Client ID — see .env.example for setup steps. */
  readonly VITE_GOOGLE_CLIENT_ID: string;
  /** The single Google account email allowed to open this app. */
  readonly VITE_ALLOWED_EMAIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
