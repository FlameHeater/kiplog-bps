import { db } from '@/db/database';
import type { Activity } from '@/types';
import { evidenceRepository } from './evidence.repository';

// Minimal CRUD for Fase 1/2 scaffolding. Transactional duration
// recalculation is handled by lib/services/activity-fields.ts before save.
export const activityRepository = {
  async list(): Promise<Activity[]> {
    return db.activities.orderBy('date').toArray();
  },
  async listByDateRange(startDate: string, endDate: string): Promise<Activity[]> {
    return db.activities.where('date').between(startDate, endDate, true, true).toArray();
  },
  async listBySkpPeriod(skpPeriod: string): Promise<Activity[]> {
    return db.activities.where('skpPeriod').equals(skpPeriod).toArray();
  },
  async get(id: string): Promise<Activity | undefined> {
    return db.activities.get(id);
  },
  async add(activity: Activity): Promise<void> {
    await db.activities.add(activity);
  },
  // FR-ACT-12: one insert per date, all in a single transaction.
  async bulkAdd(activities: Activity[]): Promise<void> {
    await db.activities.bulkAdd(activities);
  },
  // Upsert — used by the activity form/autosave, which reuses the same id
  // across create-then-update calls for the same draft.
  async save(activity: Activity): Promise<void> {
    await db.activities.put(activity);
  },
  async update(id: string, changes: Partial<Activity>): Promise<void> {
    await db.activities.update(id, { ...changes, updatedAt: new Date().toISOString() });
  },
  /** @deprecated use removeWithEvidence — plain delete leaves evidence orphaned without §9.6 handling. */
  async remove(id: string): Promise<void> {
    await db.activities.delete(id);
  },
  // FR-ACT-10/§9.6/§17.2: deleting an activity with evidence requires an
  // explicit choice — delete the evidence too, or return it to the Inbox.
  async removeWithEvidence(id: string, evidenceAction: 'delete' | 'unassign'): Promise<void> {
    if (evidenceAction === 'delete') {
      await evidenceRepository.deleteAllForActivity(id);
    } else {
      await evidenceRepository.unassignAllForActivity(id);
    }
    await db.activities.delete(id);
  },
  async count(): Promise<number> {
    return db.activities.count();
  },
  // Backup restore only.
  async bulkPut(activities: Activity[]): Promise<void> {
    await db.activities.bulkPut(activities);
  },
  async clear(): Promise<void> {
    await db.activities.clear();
  },
};
