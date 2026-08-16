import { db } from '@/db/database';
import type { PlanPeriodStatus, SkpPeriod } from '@/types';

export const skpPeriodRepository = {
  async get(id: string): Promise<SkpPeriod | undefined> {
    return db.skpPeriods.get(id);
  },
  async upsert(period: SkpPeriod): Promise<void> {
    await db.skpPeriods.put(period);
  },
  async getPlanStatus(id: string): Promise<PlanPeriodStatus | undefined> {
    return db.planPeriodStatus.get(id);
  },
  async upsertPlanStatus(status: PlanPeriodStatus): Promise<void> {
    await db.planPeriodStatus.put(status);
  },
  async list(): Promise<SkpPeriod[]> {
    return db.skpPeriods.toArray();
  },
  async listPlanStatus(): Promise<PlanPeriodStatus[]> {
    return db.planPeriodStatus.toArray();
  },
  // Backup restore only.
  async bulkPut(periods: SkpPeriod[]): Promise<void> {
    await db.skpPeriods.bulkPut(periods);
  },
  async bulkPutPlanStatus(statuses: PlanPeriodStatus[]): Promise<void> {
    await db.planPeriodStatus.bulkPut(statuses);
  },
  async clear(): Promise<void> {
    await db.skpPeriods.clear();
    await db.planPeriodStatus.clear();
  },
};
