import { FileText, FileSpreadsheet, Link2, File as FileIcon } from 'lucide-react';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import type { Evidence } from '@/types';

// FR-EVD-05: 400px WebP thumbnail for images; type icon for everything else (MVP).
export function EvidenceThumbnail({ evidence, className }: { evidence: Evidence; className?: string }) {
  const thumbUrl = useObjectUrl(evidence.thumbnailBlob ?? evidence.blob);

  if (evidence.kind === 'link') {
    return (
      <div className={className}>
        <Link2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (evidence.mimeType?.startsWith('image/') && thumbUrl) {
    return <img src={thumbUrl} alt={evidence.caption || evidence.fileName || ''} className={className} />;
  }

  const Icon = evidence.mimeType === 'application/pdf'
    ? FileText
    : evidence.mimeType?.includes('sheet') || evidence.mimeType?.includes('excel')
      ? FileSpreadsheet
      : FileIcon;

  return (
    <div className={className}>
      <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}
