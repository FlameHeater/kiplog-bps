import { db } from '@/db/database';
import type { PerformancePlan } from '@/types';

export class PlanInUseError extends Error {
  constructor(public readonly activityCount: number) {
    super(`Rencana Kinerja ini digunakan oleh ${activityCount} kegiatan dan tidak dapat dihapus. Nonaktifkan saja?`);
  }
}

export const performancePlanRepository = {
  async list(): Promise<PerformancePlan[]> {
    return db.performancePlans.orderBy('sortOrder').toArray();
  },
  async listActive(year: number): Promise<PerformancePlan[]> {
    const all = await db.performancePlans.where('year').equals(year).toArray();
    return all.filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  },
  async get(id: string): Promise<PerformancePlan | undefined> {
    return db.performancePlans.get(id);
  },
  async bulkAdd(plans: PerformancePlan[]): Promise<void> {
    await db.performancePlans.bulkAdd(plans);
  },
  async upsert(plan: PerformancePlan): Promise<void> {
    await db.performancePlans.put(plan);
  },
  // DR-05: deactivating must not break activities that already reference this plan.
  async deactivate(id: string): Promise<void> {
    await db.performancePlans.update(id, { isActive: false, updatedAt: new Date().toISOString() });
  },
  async activate(id: string): Promise<void> {
    await db.performancePlans.update(id, { isActive: true, updatedAt: new Date().toISOString() });
  },
  // §9.6: hard delete blocked while any activity still references this plan.
  async remove(id: string): Promise<void> {
    const usageCount = await db.activities.where('performancePlanId').equals(id).count();
    if (usageCount > 0) {
      throw new PlanInUseError(usageCount);
    }
    await db.performancePlans.delete(id);
  },
  async count(): Promise<number> {
    return db.performancePlans.count();
  },
  // Backup restore only — bypasses the usage/activity-linkage checks above.
  async bulkPut(plans: PerformancePlan[]): Promise<void> {
    await db.performancePlans.bulkPut(plans);
  },
  async clear(): Promise<void> {
    await db.performancePlans.clear();
  },
};
