/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Google OAuth Web Client ID — see .env.example for setup steps. */
  readonly VITE_GOOGLE_CLIENT_ID: string;
  /** Google account email(s) allowed to open this app — comma-separated for more than one. */
  readonly VITE_ALLOWED_EMAIL: string;
  /** Drive folder ID (from its URL) that all allowed accounts sync through — see .env.example. */
  readonly VITE_SYNC_FOLDER_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
