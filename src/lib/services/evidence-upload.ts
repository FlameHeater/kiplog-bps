import imageCompression from 'browser-image-compression';
import { SUPPORTED_EVIDENCE_MIME_TYPES } from '@/lib/validation/evidence.schema';

export class EvidenceValidationError extends Error {}

const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_COMPRESSION_QUALITY = 0.85;
const IMAGE_COMPRESS_THRESHOLD_MB = 2;
const THUMBNAIL_MAX_DIMENSION = 400;

// Self-hosted copy — never let browser-image-compression's web worker fetch
// its default CDN URL (see docs/ASSUMPTIONS.md, CON-06/SEC-02).
const COMPRESSION_LIB_URL = `${import.meta.env.BASE_URL}vendor/browser-image-compression.js`;

export interface ProcessedEvidenceFile {
  blob: Blob;
  thumbnailBlob?: Blob;
  fileName: string;
  mimeType: string;
  size: number;
}

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? fileName : fileName.slice(dot + 1).toUpperCase();
}

// PRD §17.1 — exact error text.
function validateType(file: File): void {
  if (!SUPPORTED_EVIDENCE_MIME_TYPES.includes(file.type as (typeof SUPPORTED_EVIDENCE_MIME_TYPES)[number])) {
    throw new EvidenceValidationError(
      `Tipe file ${fileExtension(file.name)} belum didukung. Gunakan PNG, JPG, WEBP, PDF, DOC/DOCX, atau XLS/XLSX.`
    );
  }
}

function validateSize(file: File, maxFileSizeMb: number): void {
  if (file.size > maxFileSizeMb * 1024 * 1024) {
    throw new EvidenceValidationError(
      `Ukuran file ${file.name} adalah ${formatMb(file.size)} MB, melebihi batas ${maxFileSizeMb} MB. Kompres file atau tambahkan sebagai tautan.`
    );
  }
}

/**
 * FR-EVD-03/04/05: validates type+size, compresses images over the 2MB
 * threshold (1920px / quality 0.85), and always generates a 400px WebP
 * thumbnail for images. Non-image files pass through untouched — PDF/DOC/
 * XLS use a type icon instead of a thumbnail (MVP, FR-EVD-05).
 *
 * "File asli tidak disimpan ganda": once compressed, the original bytes are
 * discarded — only the compressed blob + thumbnail are returned/persisted.
 */
export async function processEvidenceFile(
  file: File,
  options: { maxFileSizeMb: number; autoCompressImages: boolean }
): Promise<ProcessedEvidenceFile> {
  validateType(file);
  validateSize(file, options.maxFileSizeMb);

  if (!IMAGE_MIME_TYPES.has(file.type)) {
    return { blob: file, fileName: file.name, mimeType: file.type, size: file.size };
  }

  const sizeMb = file.size / (1024 * 1024);
  let workingBlob: File = file;
  if (options.autoCompressImages && sizeMb > IMAGE_COMPRESS_THRESHOLD_MB) {
    workingBlob = await imageCompression(file, {
      maxWidthOrHeight: MAX_IMAGE_DIMENSION,
      initialQuality: IMAGE_COMPRESSION_QUALITY,
      useWebWorker: true,
      libURL: COMPRESSION_LIB_URL,
    });
  }

  const thumbnailBlob = await imageCompression(file, {
    maxWidthOrHeight: THUMBNAIL_MAX_DIMENSION,
    fileType: 'image/webp',
    initialQuality: 0.8,
    useWebWorker: true,
    libURL: COMPRESSION_LIB_URL,
  });

  return {
    blob: workingBlob,
    thumbnailBlob,
    fileName: file.name,
    mimeType: workingBlob.type || file.type,
    size: workingBlob.size,
  };
}
