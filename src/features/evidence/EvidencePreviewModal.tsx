import { useState } from 'react';
import { Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import type { Evidence } from '@/types';

interface EvidencePreviewModalProps {
  evidence: Evidence | null;
  onOpenChange: (open: boolean) => void;
}

// FR-EVD-06: image gets zoom+pan (click to zoom, scroll/drag to pan via
// native overflow), PDF via <embed>, office files get an info card + download.
export function EvidencePreviewModal({ evidence, onOpenChange }: EvidencePreviewModalProps) {
  const [zoomed, setZoomed] = useState(false);
  const fileUrl = useObjectUrl(evidence?.blob);

  const isImage = evidence?.mimeType?.startsWith('image/');
  const isPdf = evidence?.mimeType === 'application/pdf';

  function download() {
    if (!fileUrl || !evidence) return;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = evidence.fileName ?? 'bukti-dukung';
    a.click();
  }

  return (
    <Dialog open={evidence !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="line-clamp-1">{evidence?.fileName ?? evidence?.caption ?? 'Pratinjau'}</DialogTitle>
        </DialogHeader>

        {evidence?.kind === 'link' ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Bukti berupa tautan eksternal.</p>
            <a
              href={evidence.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              {evidence.url}
            </a>
          </div>
        ) : isImage && fileUrl ? (
          <div className="max-h-[70vh] overflow-auto rounded-control border border-border">
            <img
              src={fileUrl}
              alt={evidence?.caption || evidence?.fileName || ''}
              onClick={() => setZoomed((z) => !z)}
              className={zoomed ? 'w-[200%] max-w-none cursor-zoom-out' : 'w-full cursor-zoom-in'}
            />
          </div>
        ) : isPdf && fileUrl ? (
          <embed src={fileUrl} type="application/pdf" className="h-[70vh] w-full rounded-control border border-border" />
        ) : (
          <div className="rounded-card border border-border p-6 text-center">
            <p className="text-sm font-medium">{evidence?.fileName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {evidence?.size ? `${(evidence.size / 1024).toFixed(0)} KB` : ''}
            </p>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          {isImage ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setZoomed((z) => !z)}>
              {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
              {zoomed ? 'Perkecil' : 'Perbesar'}
            </Button>
          ) : null}
          {evidence?.kind === 'file' ? (
            <Button type="button" variant="outline" size="sm" onClick={download}>
              <Download className="h-4 w-4" />
              Unduh
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
