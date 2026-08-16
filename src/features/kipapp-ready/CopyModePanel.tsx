import { useState } from 'react';
import { Check, Copy, Paperclip, Link2, Link2Off } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { buildCopyModeFields, buildSalinSemuaText } from '@/lib/services/copy-mode-text';
import { copyToClipboard } from '@/lib/utils/clipboard';
import type { Activity } from '@/types';

interface CopyModePanelProps {
  activity: Activity;
  isFocused: boolean;
  requireEvidenceLinkForReady: boolean;
  onFocus: () => void;
  onMarkReported: () => void;
  onUnmarkReported: () => void;
}

// FR-KAR-04…08 — two-column Copy Mode card for one kegiatan.
export function CopyModePanel({
  activity,
  isFocused,
  requireEvidenceLinkForReady,
  onFocus,
  onMarkReported,
  onUnmarkReported,
}: CopyModePanelProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fields = buildCopyModeFields(activity);
  const missingLink = !activity.evidenceLink;
  const blockReported = missingLink && requireEvidenceLinkForReady && activity.status !== 'reported';
  const isReported = activity.status === 'reported';

  async function copyField(key: string, value: string) {
    if (await copyToClipboard(value)) {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    }
  }

  async function copyAll() {
    if (await copyToClipboard(buildSalinSemuaText(activity))) {
      setCopiedKey('__all__');
      window.setTimeout(() => setCopiedKey((k) => (k === '__all__' ? null : k)), 2000);
    }
  }

  return (
    <div
      onClick={onFocus}
      className={cn(
        'grid gap-0 overflow-hidden rounded-card border md:grid-cols-2',
        isFocused ? 'border-primary ring-1 ring-primary' : 'border-border'
      )}
    >
      <div className="space-y-2 border-b border-border p-4 md:border-b-0 md:border-r">
        <p className="text-xs font-medium text-muted-foreground">Data KipLog</p>
        <p className="text-xs text-muted-foreground">
          {activity.date} · {activity.startTime}–{activity.endTime}
        </p>
        <p className="line-clamp-2 text-sm font-medium">{activity.description}</p>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary" style={{ width: `${activity.progress}%` }} />
          </div>
          <span>{activity.progress}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> {activity.evidenceCount} bukti
          </span>
          {activity.evidenceLink ? (
            <span className="flex items-center gap-1 text-success">
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> ada
            </span>
          ) : (
            <span className="flex items-center gap-1 text-warning">
              <Link2Off className="h-3.5 w-3.5" aria-hidden="true" /> belum
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 p-4">
        <p className="text-xs font-medium text-muted-foreground">Siap tempel ke KipApp</p>
        {fields.map((field) => (
          <div key={field.key} className="flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground">{field.label}</p>
              <p
                className={cn(
                  'truncate',
                  field.key === 'evidenceLink' && !field.value ? 'italic text-warning' : ''
                )}
              >
                {field.key === 'evidenceLink' && !field.value ? 'belum ada tautan' : field.value}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                void copyField(field.key, field.value);
              }}
            >
              {copiedKey === field.key ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : 'Salin'}
            </Button>
          </div>
        ))}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            void copyAll();
          }}
        >
          {copiedKey === '__all__' ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Tersalin
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Salin Semua
            </>
          )}
        </Button>

        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={blockReported}
          onClick={(e) => {
            e.stopPropagation();
            if (isReported) onUnmarkReported();
            else onMarkReported();
          }}
        >
          {isReported ? '✓ Sudah diinput — batalkan' : 'Tandai sudah diinput ke KipApp'}
        </Button>
        {blockReported ? (
          <p className="text-xs text-warning">Tautan Bukti Dukung wajib diisi sebelum ditandai.</p>
        ) : null}
      </div>
    </div>
  );
}
