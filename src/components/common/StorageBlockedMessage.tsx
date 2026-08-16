// §17.1 "IndexedDB tidak tersedia" — shown when the browser blocks local storage entirely.
export function StorageBlockedMessage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-sm font-medium text-destructive">Browser ini memblokir penyimpanan lokal.</p>
      <p className="text-xs text-muted-foreground">
        KipLog tidak dapat berjalan di mode penyamaran atau dengan penyimpanan dinonaktifkan.
      </p>
    </div>
  );
}
