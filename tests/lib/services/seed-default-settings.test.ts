import { afterEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { seedDefaultSettingsIfMissing } from '@/lib/services/seed-default-settings';

afterEach(async () => {
  await db.settings.clear();
});

describe('seedDefaultSettingsIfMissing', () => {
  it('creates default settings when none exist', async () => {
    await seedDefaultSettingsIfMissing();
    const settings = await db.settings.get('settings');
    expect(settings).toBeDefined();
    expect(settings?.workdays).toEqual([1, 2, 3, 4, 5]);
    expect(settings?.requireEvidenceForReady).toBe(true);
  });

  it('does not overwrite existing settings', async () => {
    await seedDefaultSettingsIfMissing();
    await db.settings.update('settings', { monthEndReminderDays: 9 });
    await seedDefaultSettingsIfMissing();
    const settings = await db.settings.get('settings');
    expect(settings?.monthEndReminderDays).toBe(9);
  });
});
