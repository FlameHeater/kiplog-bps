import { z } from 'zod';
import { DateStringSchema, TimeStringSchema, IsoTimestampSchema, HttpUrlSchema } from './primitives';

// Empty string ("" from a blank input) means "not set", not an invalid URL.
const OptionalUrlSchema = z.preprocess((val) => (val === '' ? null : val), HttpUrlSchema.nullable());

export const AppSettingsSchema = z.object({
  id: z.literal('settings'),
  workdays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  holidays: z.array(DateStringSchema).default([]),
  requireEvidenceForReady: z.boolean().default(true),
  requireEvidenceLinkForReady: z.boolean().default(true),
  defaultStartTime: TimeStringSchema.default('08:00'),
  defaultEndTime: TimeStringSchema.default('16:00'),
  defaultCountsTowardSkp: z.boolean().default(true),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  accentColor: z.enum(['navy', 'teal', 'indigo', 'emerald', 'orange']).default('navy'),
  maxFileSizeMb: z.number().default(10),
  autoCompressImages: z.boolean().default(true),
  monthEndReminderDays: z.number().int().default(5),
  // FR-LNK-06 — a shortcut link only, never an upload integration (CON-09).
  defaultDriveFolderUrl: OptionalUrlSchema.default(null),
  lastBackupAt: IsoTimestampSchema.nullable(),
  schemaVersion: z.number().int(),
});

// Form-only shape for the Pengaturan page — id/lastBackupAt/schemaVersion are system-managed.
export const AppSettingsFormSchema = AppSettingsSchema.omit({
  id: true,
  lastBackupAt: true,
  schemaVersion: true,
});
