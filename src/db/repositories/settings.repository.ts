import { db } from '@/db/database';
import type { AppSettings } from '@/types';

export const settingsRepository = {
  async get(): Promise<AppSettings | undefined> {
    return db.settings.get('settings');
  },
  async save(settings: AppSettings): Promise<void> {
    await db.settings.put(settings);
  },
  async clear(): Promise<void> {
    await db.settings.clear();
  },
};
