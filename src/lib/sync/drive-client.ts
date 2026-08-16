// Google Drive REST client scoped to ONE regular (visible) folder — NOT the
// hidden appDataFolder. appDataFolder is private per Google account, so it
// can't be the sync target when more than one allowed account needs to see
// the same data: the user creates a folder in one account's Drive, shares
// it (Editor) with the other allowed account(s), and both then read/write
// the same file inside it. See docs/ASSUMPTIONS.md for the trade-off this
// implies (broader Drive scope, "unverified app" consent warning).

const SYNC_FILE_NAME = 'kiplog-sync.zip';
const FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

function syncFolderId(): string {
  const id = import.meta.env.VITE_SYNC_FOLDER_ID;
  if (!id) throw new Error('VITE_SYNC_FOLDER_ID belum diatur — lihat .env.example.');
  return id;
}

async function driveFetch(url: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google Drive API error: ${res.status} ${res.statusText}`);
  return res;
}

async function findSyncFileId(accessToken: string): Promise<string | null> {
  const folderId = syncFolderId();
  const query = `'${folderId}' in parents and name='${SYNC_FILE_NAME}' and trashed=false`;
  const url = `${FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id,modifiedTime)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await driveFetch(url, accessToken);
  const data = (await res.json()) as { files: { id: string }[] };
  return data.files[0]?.id ?? null;
}

/** Uploads (creating or overwriting) the single sync snapshot in the shared folder. */
export async function uploadSyncFile(accessToken: string, blob: Blob): Promise<void> {
  const existingId = await findSyncFileId(accessToken);

  if (existingId) {
    await driveFetch(`${UPLOAD_URL}/${existingId}?uploadType=media&supportsAllDrives=true`, accessToken, {
      method: 'PATCH',
      body: blob,
    });
    return;
  }

  const metadata = { name: SYNC_FILE_NAME, parents: [syncFolderId()] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);
  await driveFetch(`${UPLOAD_URL}?uploadType=multipart&supportsAllDrives=true`, accessToken, {
    method: 'POST',
    body: form,
  });
}

/** Returns null if no sync file exists yet (first-ever sync into this folder). */
export async function downloadSyncFile(accessToken: string): Promise<Blob | null> {
  const id = await findSyncFileId(accessToken);
  if (!id) return null;
  const res = await driveFetch(`${FILES_URL}/${id}?alt=media&supportsAllDrives=true`, accessToken);
  return res.blob();
}
