import { useEffect, useRef, useState } from 'react';
import { UploadCloud, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useEvidenceUploadQueue } from './useEvidenceUploadQueue';

interface EvidenceDropzoneProps {
  activityId: string | null;
  maxFileSizeMb: number;
  autoCompressImages: boolean;
  compact?: boolean;
}

// FR-EVD-02: drag & drop, browse button, and Ctrl+V clipboard paste
// (screenshots). Paste always works anywhere on the page the moment this
// mounts — it used to require first clicking the dropzone to give it focus,
// but clicking it opens the native file picker instead, so there was no way
// to "focus" it without also derailing into file-explorer. Safe to listen
// unconditionally: this only acts when the clipboard actually contains
// files (e.dataTransfer/clipboardData.files), never on plain text, so it
// can't steal a paste meant for a text field elsewhere on the page.
export function EvidenceDropzone({ activityId, maxFileSizeMb, autoCompressImages, compact }: EvidenceDropzoneProps) {
  const { queue, uploadFiles, dismissItem } = useEvidenceUploadQueue({
    activityId,
    maxFileSizeMb,
    autoCompressImages,
  });
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length > 0) uploadFiles(files);
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-border text-center',
          compact ? 'p-4' : 'p-8',
          isDragging && 'border-primary bg-primary/5'
        )}
      >
        <UploadCloud className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Tarik bukti dukung ke sini atau <span className="text-primary">pilih file</span> · tempel{' '}
          <kbd className="rounded border border-border px-1 text-xs">Ctrl+V</kbd>
        </p>
        <p className="text-xs text-muted-foreground">
          PNG, JPG, WEBP, PDF, DOC, XLS · maks {maxFileSizeMb} MB
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {queue.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {queue.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-control border border-border px-2 py-1.5 text-xs"
            >
              {item.status === 'processing' ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
              ) : item.status === 'done' ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden="true" />
              )}
              <span className="flex-1 truncate">{item.fileName}</span>
              {item.status === 'error' ? (
                <span className="text-destructive">{item.errorMessage}</span>
              ) : null}
              {item.status !== 'processing' ? (
                <button
                  type="button"
                  onClick={() => dismissItem(item.id)}
                  aria-label={`Hapus ${item.fileName} dari daftar unggahan`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
