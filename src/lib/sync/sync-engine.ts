import { create } from 'zustand';
import { exportBackupZip, parseBackupFile, executeImport } from '@/lib/services/backup';
import { getAccessToken, requestSilentToken } from '@/lib/auth/google-identity';
import { setOnLocalWrite } from '@/db/database';
import { downloadSyncFile, uploadSyncFile } from './drive-client';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'synced';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

export const useSyncStore = create<SyncState>(() => ({
  status: 'idle',
  lastSyncedAt: null,
  errorMessage: null,
}));

const LAST_SYNCED_KEY = 'kiplog-last-synced-exported-at';
const DEBOUNCE_MS = 8000;

let dirty = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;

async function ensureToken(): Promise<string | null> {
  return getAccessToken() ?? (await requestSilentToken());
}

function readLastSyncedExportedAt(): string | null {
  return localStorage.getItem(LAST_SYNCED_KEY);
}

function writeLastSyncedExportedAt(exportedAt: string): void {
  localStorage.setItem(LAST_SYNCED_KEY, exportedAt);
}

/** Pushes the current local state to Drive, overwriting the single sync snapshot. */
async function push(): Promise<void> {
  const token = await ensureToken();
  if (!token) return; // offline or not signed in — silently skip, next trigger retries

  useSyncStore.setState({ status: 'syncing', errorMessage: null });
  try {
    const { blob } = await exportBackupZip();
    await uploadSyncFile(token, blob);
    // exportBackupZip's payload.exportedAt is embedded inside the zip, but we
    // only need *a* fresh local marker here — re-reading it back out isn't
    // worth the round trip, "now" is accurate enough since we just built it.
    const exportedAt = new Date().toISOString();
    writeLastSyncedExportedAt(exportedAt);
    dirty = false;
    useSyncStore.setState({ status: 'synced', lastSyncedAt: exportedAt });
  } catch (err) {
    useSyncStore.setState({ status: 'error', errorMessage: (err as Error).message });
  }
}

/**
 * Pulls the Drive snapshot and replaces local data ONLY if it's newer than
 * the last snapshot this device itself pushed/pulled — see docs/ASSUMPTIONS.md
 * for why this is whole-snapshot last-write-wins, not per-record merge.
 */
async function pull(): Promise<void> {
  const token = await ensureToken();
  if (!token) return;

  useSyncStore.setState({ status: 'syncing', errorMessage: null });
  try {
    const blob = await downloadSyncFile(token);
    if (!blob) {
      // Nothing in Drive yet (first-ever sync from this account) — push once.
      useSyncStore.setState({ status: 'idle' });
      await push();
      return;
    }

    const file = new File([blob], 'kiplog-sync.zip', { type: 'application/zip' });
    const parsed = await parseBackupFile(file);
    const lastSynced = readLastSyncedExportedAt();

    if (!lastSynced || parsed.payload.exportedAt > lastSynced) {
      await executeImport(parsed, 'replace');
      writeLastSyncedExportedAt(parsed.payload.exportedAt);
      dirty = false;
    }
    useSyncStore.setState({ status: 'synced', lastSyncedAt: parsed.payload.exportedAt });
  } catch (err) {
    useSyncStore.setState({ status: 'error', errorMessage: (err as Error).message });
  }
}

function markDirty(): void {
  dirty = true;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (dirty && !syncing) void pushIfDirty();
  }, DEBOUNCE_MS);
}

setOnLocalWrite(markDirty);

async function pushIfDirty(): Promise<void> {
  if (!dirty || syncing) return;
  syncing = true;
  try {
    await push();
  } finally {
    syncing = false;
  }
}

/** Called once after successful sign-in, before the app renders local data. */
export async function pullOnStart(): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    await pull();
  } finally {
    syncing = false;
  }
}

/** Manual "Sinkron Sekarang" button — pulls first (in case another device pushed more recently), then pushes if there are local changes since. */
export async function syncNow(): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    await pull();
    if (dirty) await push();
  } finally {
    syncing = false;
  }
}

// Best-effort push when the tab is backgrounded/closed — catches changes
// made right before the debounce timer would have fired.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && dirty && !syncing) {
      void pushIfDirty();
    }
  });
}
