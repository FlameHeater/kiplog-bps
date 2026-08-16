import { performancePlanRepository } from '@/db/repositories';
import { applyLocalLearning } from '@/lib/matching/rk-matcher';
import type { PerformancePlan } from '@/types';

/** FR-SRK-07 / §12.1.4 — every RK selection (from the recommendation panel
 * or the full combobox) reinforces usage stats and local keyword learning. */
export async function recordRkSelection(plan: PerformancePlan, description: string): Promise<void> {
  await performancePlanRepository.upsert({
    ...plan,
    usageCount: plan.usageCount + 1,
    lastUsedAt: new Date().toISOString(),
    keywords: applyLocalLearning(plan, description),
    updatedAt: new Date().toISOString(),
  });
}
