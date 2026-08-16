// §17.1 "IndexedDB tidak tersedia" — Safari private browsing and similar
// locked-down modes still expose `window.indexedDB` but throw (or hang)
// when actually opening a database, so a plain `typeof` check isn't enough.
//
// This opens the app's own database (not a throwaway probe name) with no
// explicit version, so it never triggers a version-upgrade transaction —
// opening a brand-new database via `onupgradeneeded` has been observed to
// hang indefinitely (never firing `onsuccess`) in at least one real
// environment, which would make a synthetic probe DB report "blocked" even
// when storage works fine. Matches the name in `src/db/database.ts`.
const APP_DB_NAME = 'kiplog-bps';

export function checkIndexedDbAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(false);
      return;
    }
    try {
      const request = indexedDB.open(APP_DB_NAME);
      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        request.result.close();
        resolve(true);
      };
      // Some browsers neither fire onerror nor onsuccess when storage is
      // blocked — fail closed after a short timeout instead of hanging.
      setTimeout(() => resolve(false), 2000);
    } catch {
      resolve(false);
    }
  });
}
