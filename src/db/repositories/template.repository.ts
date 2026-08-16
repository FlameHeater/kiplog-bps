import { db } from '@/db/database';
import type { ActivityTemplate } from '@/types';

export const templateRepository = {
  async list(): Promise<ActivityTemplate[]> {
    return db.templates.orderBy('name').toArray();
  },
  async get(id: string): Promise<ActivityTemplate | undefined> {
    return db.templates.get(id);
  },
  async upsert(template: ActivityTemplate): Promise<void> {
    await db.templates.put(template);
  },
  async remove(id: string): Promise<void> {
    await db.templates.delete(id);
  },
  // Backup restore only.
  async bulkPut(templates: ActivityTemplate[]): Promise<void> {
    await db.templates.bulkPut(templates);
  },
  async clear(): Promise<void> {
    await db.templates.clear();
  },
};
