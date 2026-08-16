import { useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { EvidenceDropzone } from './EvidenceDropzone';
import { AddLinkEvidenceForm } from './AddLinkEvidenceForm';
import { EvidenceCard } from './EvidenceCard';
import { EvidencePreviewModal } from './EvidencePreviewModal';
import { useEvidenceForActivity } from '@/hooks/useEvidenceForActivity';
import { evidenceRepository } from '@/db/repositories';
import type { AppSettings, Evidence } from '@/types';

interface EvidenceGalleryProps {
  activityId: string;
  settings: AppSettings | undefined;
}

// FR-EVD-01: Evidence Gallery for one kegiatan.
export function EvidenceGallery({ activityId, settings }: EvidenceGalleryProps) {
  const evidence = useEvidenceForActivity(activityId);
  const [previewing, setPreviewing] = useState<Evidence | null>(null);

  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= evidence.length) return;
    const reordered = [...evidence];
    const temp = reordered[index]!;
    reordered[index] = reordered[target]!;
    reordered[target] = temp;
    await evidenceRepository.reorder(activityId, reordered.map((e) => e.id));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">Bukti Dukung ({evidence.length})</p>
        <AddLinkEvidenceForm activityId={activityId} />
      </div>

      <EvidenceDropzone
        activityId={activityId}
        maxFileSizeMb={settings?.maxFileSizeMb ?? 10}
        autoCompressImages={settings?.autoCompressImages ?? true}
        compact
      />

      {evidence.length === 0 ? null : (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {evidence.map((item, index) => (
            <EvidenceCard
              key={item.id}
              evidence={item}
              onPreview={() => setPreviewing(item)}
              onMoveUp={index > 0 ? () => void move(index, -1) : undefined}
              onMoveDown={index < evidence.length - 1 ? () => void move(index, 1) : undefined}
            />
          ))}
        </div>
      )}

      <EvidencePreviewModal evidence={previewing} onOpenChange={(open) => !open && setPreviewing(null)} />
    </div>
  );
}

// Fallback used before an activity has been saved yet (no id to attach to).
export function EvidenceGalleryPlaceholder() {
  return <EmptyState title="Simpan kegiatan terlebih dahulu untuk menambah bukti dukung." />;
}
