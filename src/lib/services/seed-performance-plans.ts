import { PERFORMANCE_PLANS_2026, type PerformancePlanSeed } from '@/data/performance-plans-2026';
import { performancePlanRepository } from '@/db/repositories';
import type { PerformancePlan } from '@/types';

const SEED_YEAR = 2026;

/**
 * Pure transform, verbatim wording preserved (DR-01) — exported so tests
 * (e.g. the §12.1.5 RK-matcher fixtures) can build real PerformancePlan
 * objects from the seed without touching Dexie.
 */
export function toPerformancePlans(seeds: PerformancePlanSeed[] = PERFORMANCE_PLANS_2026): PerformancePlan[] {
  const now = new Date().toISOString();
  return seeds.map((seed) => ({
    id: crypto.randomUUID(),
    year: SEED_YEAR,
    type: seed.type,
    name: seed.name,
    parentPlanName: seed.parentPlanName,
    teamName: seed.teamName,
    teamLeader: seed.teamLeader,
    category: seed.category,
    keywords: seed.keywords,
    tags: seed.tags,
    color: seed.color,
    isActive: true,
    isFavorite: false,
    sortOrder: seed.no,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * Transforms the verbatim RK seed (PRD §5.2, DR-01) into PerformancePlan
 * entities and inserts them if the table is empty.
 */
export async function seedPerformancePlansIfEmpty(): Promise<{ seeded: boolean; count: number }> {
  const existing = await performancePlanRepository.count();
  if (existing > 0) {
    return { seeded: false, count: existing };
  }

  const plans = toPerformancePlans();
  await performancePlanRepository.bulkAdd(plans);
  return { seeded: true, count: plans.length };
}
