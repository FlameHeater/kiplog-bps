// Google Drive REST client scoped to ONE regular (visible) folder — NOT the
// hidden appDataFolder. appDataFolder is private per Google account, so it
// can't be the sync target when more than one allowed account needs to see
// the same data: the user creates a folder in one account's Drive, shares
// it (Editor) with the other allowed account(s), and both then read/write
// the same files inside it.
//
// Storage is organized as real, browsable files/folders — not one opaque
// zip — so the user can open the Drive folder and actually see what's in
// it:
//   <sync folder>/
//     kiplog-data.json      — activities/RK/settings/etc. (readable JSON)
//     evidence/
//       <evidenceId>.<ext>          — original file
//       <evidenceId>_thumb.webp     — thumbnail

const DATA_FILE_NAME = 'kiplog-data.json';
const EVIDENCE_FOLDER_NAME = 'evidence';
const FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

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

async function findFileId(accessToken: string, name: string, parentId: string): Promise<string | null> {
  const query = `'${parentId}' in parents and name='${name}' and trashed=false`;
  const url = `${FILES_URL}?q=${encodeURIComponent(query)}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await driveFetch(url, accessToken);
  const data = (await res.json()) as { files: { id: string }[] };
  return data.files[0]?.id ?? null;
}

let cachedEvidenceFolderId: string | null = null;

/** Finds (or creates, once per session) the `evidence/` subfolder inside the sync folder. */
async function getEvidenceFolderId(accessToken: string): Promise<string> {
  if (cachedEvidenceFolderId) return cachedEvidenceFolderId;

  const parent = syncFolderId();
  const existing = await findFileId(accessToken, EVIDENCE_FOLDER_NAME, parent);
  if (existing) {
    cachedEvidenceFolderId = existing;
    return existing;
  }

  const res = await driveFetch(`${FILES_URL}?supportsAllDrives=true`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: EVIDENCE_FOLDER_NAME, mimeType: FOLDER_MIME, parents: [parent] }),
  });
  const created = (await res.json()) as { id: string };
  cachedEvidenceFolderId = created.id;
  return created.id;
}

async function uploadFile(
  accessToken: string,
  name: string,
  parentId: string,
  blob: Blob,
  mimeType: string
): Promise<void> {
  const existingId = await findFileId(accessToken, name, parentId);
  if (existingId) {
    await driveFetch(`${UPLOAD_URL}/${existingId}?uploadType=media&supportsAllDrives=true`, accessToken, {
      method: 'PATCH',
      headers: { 'Content-Type': mimeType },
      body: blob,
    });
    return;
  }

  const metadata = { name, parents: [parentId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);
  await driveFetch(`${UPLOAD_URL}?uploadType=multipart&supportsAllDrives=true`, accessToken, {
    method: 'POST',
    body: form,
  });
}

async function downloadFileByName(accessToken: string, name: string, parentId: string): Promise<Blob | null> {
  const id = await findFileId(accessToken, name, parentId);
  if (!id) return null;
  const res = await driveFetch(`${FILES_URL}/${id}?alt=media&supportsAllDrives=true`, accessToken);
  return res.blob();
}

/** Uploads (creating or overwriting) the structured-data file at the sync folder's root. */
export async function uploadDataFile(accessToken: string, jsonBlob: Blob): Promise<void> {
  await uploadFile(accessToken, DATA_FILE_NAME, syncFolderId(), jsonBlob, 'application/json');
}

/** Returns null if no data file exists yet (first-ever push into this folder). */
export async function downloadDataFile(accessToken: string): Promise<Blob | null> {
  return downloadFileByName(accessToken, DATA_FILE_NAME, syncFolderId());
}

/** Uploads one evidence file (or its thumbnail) by exact name into the evidence/ subfolder. */
export async function uploadEvidenceFile(accessToken: string, filename: string, blob: Blob): Promise<void> {
  const folderId = await getEvidenceFolderId(accessToken);
  await uploadFile(accessToken, filename, folderId, blob, blob.type || 'application/octet-stream');
}

/** Names of every file currently in the evidence/ subfolder (for deciding what's new during a pull). */
export async function listEvidenceFileNames(accessToken: string): Promise<string[]> {
  const folderId = await getEvidenceFolderId(accessToken);
  const query = `'${folderId}' in parents and trashed=false`;
  const url = `${FILES_URL}?q=${encodeURIComponent(query)}&fields=files(name)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await driveFetch(url, accessToken);
  const data = (await res.json()) as { files: { name: string }[] };
  return data.files.map((f) => f.name);
}

export async function downloadEvidenceFile(accessToken: string, filename: string): Promise<Blob | null> {
  const folderId = await getEvidenceFolderId(accessToken);
  return downloadFileByName(accessToken, filename, folderId);
}
