import { z } from 'zod';
import { KipAppStatusSchema } from './enums';
import { IsoTimestampSchema, HttpUrlSchema, SkpPeriodStringSchema } from './primitives';

// Empty string ("" from a blank input) means "not set", not an invalid URL —
// same pattern as AppSettings.defaultDriveFolderUrl.
const OptionalUrlSchema = z.preprocess((val) => (val === '' ? null : val), HttpUrlSchema.nullable());

export const SkpPeriodSchema = z.object({
  id: SkpPeriodStringSchema, // "2026-08"
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  kipAppStatus: KipAppStatusSchema.default('sedang_dibuat'),
  isLocked: z.boolean().default(false),
  lockedAt: IsoTimestampSchema.nullable(),
  notes: z.string().optional(),
  // FR — link bukti dukung "standar" satu bulan, dipakai untuk mengisi
  // otomatis evidenceLink kegiatan baru di bulan itu (lihat
  // src/lib/services/monthly-evidence-link.ts) dan mengisi kegiatan lama
  // yang belum punya link saat pengguna menyimpannya.
  defaultEvidenceLink: OptionalUrlSchema.default(null),
  updatedAt: IsoTimestampSchema,
});

export const PlanPeriodStatusSchema = z.object({
  id: z.string(), // `${planId}:${skpPeriod}`
  performancePlanId: z.string().uuid(),
  skpPeriod: SkpPeriodStringSchema,
  isCompleted: z.boolean().default(false),
  completedAt: IsoTimestampSchema.nullable(),
});
