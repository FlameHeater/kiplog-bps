import { z } from 'zod';

// PRD §9.3
export const ActivityStatusSchema = z.enum([
  'draft',
  'complete',
  'ready_to_report',
  'reported',
  'archived',
]);

export const EvidenceLinkStatusSchema = z.enum(['none', 'collected', 'packaged', 'uploaded']);

export const EvidenceCategorySchema = z.enum([
  'screenshot',
  'dokumen',
  'foto',
  'spreadsheet',
  'surat_tugas',
  'notulen',
  'tautan',
  'lainnya',
]);

export const RbAreaSchema = z.enum([
  'Penataan dan Penguatan Organisasi',
  'Penataan Peraturan Perundang-Undangan',
  'Penataan Sumber Daya Manusia',
  'Penataan Tata Laksana',
  'Peningkatan Kualitas Pelayanan Publik',
  'Penguatan Pengawasan',
  'Penguatan Akuntabilitas Kinerja',
  'Manajemen Perubahan',
]);

export const PlanTypeSchema = z.enum(['Utama', 'Tambahan']);

export const KipAppStatusSchema = z.enum(['sedang_dibuat', 'sedang_diperiksa', 'dinilai']);

export const EvidenceKindSchema = z.enum(['file', 'link']);

export const InboxStatusSchema = z.enum(['unassigned', 'assigned', 'archived']);

export const LinkProviderSchema = z.enum([
  'gdrive',
  'onedrive',
  'sharepoint',
  'internal',
  'other',
]);
