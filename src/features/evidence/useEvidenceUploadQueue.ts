import { useState } from 'react';
import { evidenceRepository } from '@/db/repositories';
import { EvidenceValidationError, processEvidenceFile } from '@/lib/services/evidence-upload';
import type { Evidence } from '@/types';

export interface UploadQueueItem {
  id: string;
  fileName: string;
  status: 'processing' | 'done' | 'error';
  errorMessage?: string;
}

interface UseEvidenceUploadQueueOptions {
  activityId: string | null; // null = Evidence Inbox
  maxFileSizeMb: number;
  autoCompressImages: boolean;
}

// FR-EVD-02/04/08/09: shared upload pipeline for the Activity form's gallery
// and the Evidence Inbox — validates+compresses each file independently
// (parallel) and shows per-file status so one bad file doesn't block the rest.
export function useEvidenceUploadQueue({
  activityId,
  maxFileSizeMb,
  autoCompressImages,
}: UseEvidenceUploadQueueOptions) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);

  function updateItem(id: string, changes: Partial<UploadQueueItem>) {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  async function uploadOne(file: File) {
    const queueId = crypto.randomUUID();
    setQueue((prev) => [...prev, { id: queueId, fileName: file.name, status: 'processing' }]);

    try {
      const processed = await processEvidenceFile(file, { maxFileSizeMb, autoCompressImages });
      const now = new Date().toISOString();
      const evidence: Evidence = {
        id: crypto.randomUUID(),
        activityId,
        kind: 'file',
        blob: processed.blob,
        thumbnailBlob: processed.thumbnailBlob,
        fileName: processed.fileName,
        mimeType: processed.mimeType,
        size: processed.size,
        caption: '',
        category: 'lainnya',
        sortOrder: 0,
        inboxStatus: activityId ? 'assigned' : 'unassigned',
        capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : null,
        createdAt: now,
        updatedAt: now,
      };
      if (activityId) {
        await evidenceRepository.addForActivity(evidence);
      } else {
        await evidenceRepository.add(evidence);
      }
      updateItem(queueId, { status: 'done' });
    } catch (err) {
      updateItem(queueId, {
        status: 'error',
        errorMessage:
          err instanceof EvidenceValidationError
            ? err.message
            : 'Gagal mengunggah bukti dukung. File asli masih ada di perangkat Anda. Coba lagi.',
      });
    }
  }

  function uploadFiles(files: FileList | File[]) {
    // Parallel (FR-EVD-08) — each file's promise is independent.
    void Promise.allSettled(Array.from(files).map((file) => uploadOne(file)));
  }

  function dismissItem(id: string) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }

  return { queue, uploadFiles, dismissItem };
}
