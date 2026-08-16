import { create } from 'zustand';
import { collectPayload, executeImport, extensionFromMimeType, migratePayload, type BackupPayload } from '@/lib/services/backup';
import { evidenceRepository } from '@/db/repositories';
import { getAccessToken, requestSilentToken } from '@/lib/auth/google-identity';
import { setOnLocalWrite } from '@/db/database';
import { downloadDataFile, downloadEvidenceFile, listEvidenceFileNames, uploadDataFile, uploadEvidenceFile } from './drive-client';

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
// Evidence blobs rarely change once added — remembering which ids have
// already reached Drive avoids re-uploading every file on every push (an
// evidence library can be large; re-sending it all every 8s would be slow
// and burn through Drive API quota for no reason).
const EVIDENCE_SYNCED_KEY = 'kiplog-evidence-synced-ids';
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

function readSyncedEvidenceIds(): Set<string> {
  try {
    const raw = localStorage.getItem(EVIDENCE_SYNCED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeSyncedEvidenceIds(ids: Set<string>): void {
  localStorage.setItem(EVIDENCE_SYNCED_KEY, JSON.stringify(Array.from(ids)));
}

function evidenceFilenames(item: { id: string; mimeType?: string }): { file: string; thumb: string } {
  return { file: `${item.id}.${extensionFromMimeType(item.mimeType)}`, thumb: `${item.id}_thumb.webp` };
}

/**
 * Pushes the current local state to Drive as organized, readable files
 * (kiplog-data.json + evidence/<id>.<ext>) instead of one opaque zip — see
 * docs/ASSUMPTIONS.md.
 */
async function push(): Promise<void> {
  const token = await ensureToken();
  if (!token) return; // offline or not signed in — silently skip, next trigger retries

  useSyncStore.setState({ status: 'syncing', errorMessage: null });
  try {
    const payload = await collectPayload();
    const dataBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    await uploadDataFile(token, dataBlob);

    const allEvidence = await evidenceRepository.list();
    const synced = readSyncedEvidenceIds();
    for (const item of allEvidence) {
      if (synced.has(item.id)) continue;
      const { file, thumb } = evidenceFilenames(item);
      if (item.blob) await uploadEvidenceFile(token, file, item.blob);
      if (item.thumbnailBlob) await uploadEvidenceFile(token, thumb, item.thumbnailBlob);
      if (item.blob || item.thumbnailBlob) synced.add(item.id);
    }
    writeSyncedEvidenceIds(synced);

    writeLastSyncedExportedAt(payload.exportedAt);
    dirty = false;
    useSyncStore.setState({ status: 'synced', lastSyncedAt: payload.exportedAt });
  } catch (err) {
    useSyncStore.setState({ status: 'error', errorMessage: (err as Error).message });
  }
}

/**
 * Pulls the Drive folder and replaces local data ONLY if it's newer than
 * the last snapshot this device itself pushed/pulled — see docs/ASSUMPTIONS.md
 * for why this is whole-snapshot last-write-wins, not per-record merge.
 */
async function pull(): Promise<void> {
  const token = await ensureToken();
  if (!token) return;

  useSyncStore.setState({ status: 'syncing', errorMessage: null });
  try {
    const dataBlob = await downloadDataFile(token);
    if (!dataBlob) {
      // Nothing in Drive yet (first-ever sync into this folder) — push once.
      useSyncStore.setState({ status: 'idle' });
      await push();
      return;
    }

    const payload = migratePayload(JSON.parse(await dataBlob.text()) as BackupPayload);
    const lastSynced = readLastSyncedExportedAt();

    if (!lastSynced || payload.exportedAt > lastSynced) {
      const driveFilenames = new Set(await listEvidenceFileNames(token));
      const synced = readSyncedEvidenceIds();
      const evidenceBlobs = new Map<string, { blob?: Blob; thumbnailBlob?: Blob }>();

      for (const item of payload.evidence) {
        const { file, thumb } = evidenceFilenames(item);
        const hasFile = driveFilenames.has(file);
        const hasThumb = driveFilenames.has(thumb);
        if (!hasFile && !hasThumb) continue;
        const [blob, thumbnailBlob] = await Promise.all([
          hasFile ? downloadEvidenceFile(token, file) : Promise.resolve(undefined),
          hasThumb ? downloadEvidenceFile(token, thumb) : Promise.resolve(undefined),
        ]);
        evidenceBlobs.set(item.id, { blob: blob ?? undefined, thumbnailBlob: thumbnailBlob ?? undefined });
        // Already on Drive — this device never needs to re-upload it.
        synced.add(item.id);
      }
      writeSyncedEvidenceIds(synced);

      await executeImport({ payload, evidenceBlobs }, 'replace');
      writeLastSyncedExportedAt(payload.exportedAt);
      dirty = false;
    }
    useSyncStore.setState({ status: 'synced', lastSyncedAt: payload.exportedAt });
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
