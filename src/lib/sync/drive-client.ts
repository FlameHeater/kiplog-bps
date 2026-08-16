// Minimal Google Drive REST client scoped to the hidden `appDataFolder`
// (drive.appdata scope) — not the user's visible Drive, so there's nothing
// for them to accidentally move/delete/share, and no folder-picker UI needed.

const SYNC_FILE_NAME = 'kiplog-sync.zip';
const FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

async function driveFetch(url: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google Drive API error: ${res.status} ${res.statusText}`);
  return res;
}

async function findSyncFileId(accessToken: string): Promise<string | null> {
  const url = `${FILES_URL}?spaces=appDataFolder&q=${encodeURIComponent(`name='${SYNC_FILE_NAME}'`)}&fields=files(id,modifiedTime)`;
  const res = await driveFetch(url, accessToken);
  const data = (await res.json()) as { files: { id: string }[] };
  return data.files[0]?.id ?? null;
}

/** Uploads (creating or overwriting) the single sync snapshot in appDataFolder. */
export async function uploadSyncFile(accessToken: string, blob: Blob): Promise<void> {
  const existingId = await findSyncFileId(accessToken);

  if (existingId) {
    await driveFetch(`${UPLOAD_URL}/${existingId}?uploadType=media`, accessToken, {
      method: 'PATCH',
      body: blob,
    });
    return;
  }

  const metadata = { name: SYNC_FILE_NAME, parents: ['appDataFolder'] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);
  await driveFetch(`${UPLOAD_URL}?uploadType=multipart`, accessToken, { method: 'POST', body: form });
}

/** Returns null if no sync file exists yet (first-ever sync from this account). */
export async function downloadSyncFile(accessToken: string): Promise<Blob | null> {
  const id = await findSyncFileId(accessToken);
  if (!id) return null;
  const res = await driveFetch(`${FILES_URL}/${id}?alt=media`, accessToken);
  return res.blob();
}
