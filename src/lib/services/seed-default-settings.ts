import { settingsRepository } from '@/db/repositories';
import { HOLIDAYS_ID_2026_SEED } from '@/data/holidays-id';
import { SCHEMA_VERSION } from '@/lib/version';

/**
 * AppSettings is a singleton every feature reads (workdays/holidays for
 * calendar & coverage, default times/countsTowardSkp for the activity
 * form). Without this, `useSettings()` stays `null` forever and anything
 * gated on it (Duplicate, form defaults) silently no-ops.
 */
export async function seedDefaultSettingsIfMissing(): Promise<void> {
  const existing = await settingsRepository.get();
  if (existing) return;

  await settingsRepository.save({
    id: 'settings',
    workdays: [1, 2, 3, 4, 5],
    holidays: HOLIDAYS_ID_2026_SEED,
    requireEvidenceForReady: true,
    requireEvidenceLinkForReady: true,
    defaultStartTime: '08:00',
    defaultEndTime: '16:00',
    defaultCountsTowardSkp: true,
    theme: 'system',
    accentColor: 'navy',
    maxFileSizeMb: 10,
    autoCompressImages: true,
    monthEndReminderDays: 5,
    defaultDriveFolderUrl: null,
    lastBackupAt: null,
    schemaVersion: SCHEMA_VERSION,
  });
}
