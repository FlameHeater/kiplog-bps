import type { PerformancePlan } from '@/types';

export interface OrderedPlans {
  favorites: PerformancePlan[];
  recent: PerformancePlan[];
  frequent: PerformancePlan[];
  byTeam: Map<string, PerformancePlan[]>;
}

const RECENT_LIMIT = 5;
const FREQUENT_LIMIT = 5;

/**
 * FR-RKS-02 default order: Favorit → Baru digunakan (5) → Sering digunakan
 * (5) → sisanya per tim. Each plan appears in exactly one bucket — a
 * favorite never also shows up under "recent"/"frequent"/team groups.
 */
export function orderPlansForCombobox(plans: PerformancePlan[]): OrderedPlans {
  const seen = new Set<string>();

  const favorites = plans
    .filter((p) => p.isFavorite)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  favorites.forEach((p) => seen.add(p.id));

  const remaining = plans.filter((p) => !seen.has(p.id));

  const recent = [...remaining]
    .filter((p) => p.lastUsedAt !== null)
    .sort((a, b) => (b.lastUsedAt as string).localeCompare(a.lastUsedAt as string))
    .slice(0, RECENT_LIMIT);
  recent.forEach((p) => seen.add(p.id));

  const remainingAfterRecent = remaining.filter((p) => !seen.has(p.id));

  const frequent = [...remainingAfterRecent]
    .filter((p) => p.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, FREQUENT_LIMIT);
  frequent.forEach((p) => seen.add(p.id));

  const byTeam = new Map<string, PerformancePlan[]>();
  for (const plan of plans) {
    if (seen.has(plan.id)) continue;
    const key = plan.teamName ?? 'Tanpa Tim';
    const group = byTeam.get(key) ?? [];
    group.push(plan);
    byTeam.set(key, group);
  }
  for (const group of byTeam.values()) {
    group.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return { favorites, recent, frequent, byTeam };
}
