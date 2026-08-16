import { describe, expect, it } from 'vitest';
import { EvidenceValidationError, processEvidenceFile } from '@/lib/services/evidence-upload';

function makeFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe('processEvidenceFile — validation', () => {
  it('rejects an unsupported file type with the exact PRD message', async () => {
    const file = makeFile('archive.zip', 'application/zip', 1000);
    await expect(processEvidenceFile(file, { maxFileSizeMb: 10, autoCompressImages: true })).rejects.toThrow(
      EvidenceValidationError
    );
    await expect(
      processEvidenceFile(file, { maxFileSizeMb: 10, autoCompressImages: true })
    ).rejects.toThrow('Tipe file ZIP belum didukung. Gunakan PNG, JPG, WEBP, PDF, DOC/DOCX, atau XLS/XLSX.');
  });

  it('rejects a file over the configured size limit', async () => {
    const file = makeFile('besar.pdf', 'application/pdf', 11 * 1024 * 1024);
    await expect(processEvidenceFile(file, { maxFileSizeMb: 10, autoCompressImages: true })).rejects.toThrow(
      /melebihi batas 10 MB/
    );
  });

  it('passes non-image files through untouched (no thumbnail)', async () => {
    const file = makeFile('surat-tugas.pdf', 'application/pdf', 1024);
    const result = await processEvidenceFile(file, { maxFileSizeMb: 10, autoCompressImages: true });
    expect(result.thumbnailBlob).toBeUndefined();
    expect(result.mimeType).toBe('application/pdf');
    expect(result.size).toBe(1024);
  });
});
