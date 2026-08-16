import type { Activity, ActivityStatus, PerformancePlan, PlanType } from '@/types';

const BOOLEAN_KEYS = ['hasEvidence', 'hasEvidenceLink', 'countsTowardSkp'] as const;
const NUMBER_KEYS = ['progressMin', 'progressMax'] as const;
const STRING_KEYS = [
  'dateFrom', 'dateTo', 'skpPeriod', 'performancePlanId', 'planType', 'status', 'category', 'tag',
] as const;

/** FR-SCH-06 — filter state round-trips through the URL query string. */
export function filtersToSearchParams(filters: ActivityFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of STRING_KEYS) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  for (const key of NUMBER_KEYS) {
    const value = filters[key];
    if (value !== undefined) params.set(key, String(value));
  }
  for (const key of BOOLEAN_KEYS) {
    const value = filters[key];
    if (value !== undefined) params.set(key, String(value));
  }
  return params;
}

export function filtersFromSearchParams(params: URLSearchParams): ActivityFilters {
  const filters: ActivityFilters = {};
  for (const key of STRING_KEYS) {
    const value = params.get(key);
    if (value) (filters as Record<string, string>)[key] = value;
  }
  for (const key of NUMBER_KEYS) {
    const value = params.get(key);
    if (value !== null) (filters as Record<string, number>)[key] = Number(value);
  }
  for (const key of BOOLEAN_KEYS) {
    const value = params.get(key);
    if (value !== null) (filters as Record<string, boolean>)[key] = value === 'true';
  }
  return filters;
}

export interface ActivityFilters {
  dateFrom?: string;
  dateTo?: string;
  skpPeriod?: string;
  performancePlanId?: string;
  planType?: PlanType;
  status?: ActivityStatus;
  progressMin?: number;
  progressMax?: number;
  hasEvidence?: boolean;
  hasEvidenceLink?: boolean;
  countsTowardSkp?: boolean;
  category?: string; // PerformancePlan.category
  tag?: string;
}

/** FR-SCH-04 — every filter is optional/additive (AND). */
export function applyActivityFilters(
  activities: Activity[],
  filters: ActivityFilters,
  planById: Map<string, PerformancePlan>
): Activity[] {
  return activities.filter((a) => {
    if (filters.dateFrom && a.date < filters.dateFrom) return false;
    if (filters.dateTo && a.date > filters.dateTo) return false;
    if (filters.skpPeriod && a.skpPeriod !== filters.skpPeriod) return false;
    if (filters.performancePlanId && a.performancePlanId !== filters.performancePlanId) return false;
    if (filters.status && a.status !== filters.status) return false;
    if (filters.progressMin !== undefined && a.progress < filters.progressMin) return false;
    if (filters.progressMax !== undefined && a.progress > filters.progressMax) return false;
    if (filters.hasEvidence !== undefined && (a.evidenceCount > 0) !== filters.hasEvidence) return false;
    if (filters.hasEvidenceLink !== undefined && (a.evidenceLink !== null) !== filters.hasEvidenceLink) return false;
    if (filters.countsTowardSkp !== undefined && a.countsTowardSkp !== filters.countsTowardSkp) return false;
    if (filters.tag && !a.tags.includes(filters.tag)) return false;

    const plan = a.performancePlanId ? planById.get(a.performancePlanId) : undefined;
    if (filters.planType && plan?.type !== filters.planType) return false;
    if (filters.category && plan?.category !== filters.category) return false;

    return true;
  });
}

/** Human-readable chip labels for whatever filters are active. */
export function describeActiveFilters(
  filters: ActivityFilters,
  planById: Map<string, PerformancePlan>
): { key: keyof ActivityFilters; label: string }[] {
  const chips: { key: keyof ActivityFilters; label: string }[] = [];
  if (filters.dateFrom) chips.push({ key: 'dateFrom', label: `Dari ${filters.dateFrom}` });
  if (filters.dateTo) chips.push({ key: 'dateTo', label: `Sampai ${filters.dateTo}` });
  if (filters.skpPeriod) chips.push({ key: 'skpPeriod', label: `Periode ${filters.skpPeriod}` });
  if (filters.performancePlanId) {
    const plan = planById.get(filters.performancePlanId);
    chips.push({ key: 'performancePlanId', label: `RK: ${plan?.displayName ?? plan?.name ?? '—'}` });
  }
  if (filters.planType) chips.push({ key: 'planType', label: `Jenis: ${filters.planType}` });
  if (filters.status) chips.push({ key: 'status', label: `Status: ${filters.status}` });
  if (filters.progressMin !== undefined || filters.progressMax !== undefined) {
    chips.push({
      key: 'progressMin',
      label: `Progress ${filters.progressMin ?? 0}–${filters.progressMax ?? 100}`,
    });
  }
  if (filters.hasEvidence !== undefined) {
    chips.push({ key: 'hasEvidence', label: filters.hasEvidence ? 'Ada bukti' : 'Tanpa bukti' });
  }
  if (filters.hasEvidenceLink !== undefined) {
    chips.push({
      key: 'hasEvidenceLink',
      label: filters.hasEvidenceLink ? 'Ada Link Bukti Dukung' : 'Tanpa Link Bukti Dukung',
    });
  }
  if (filters.countsTowardSkp !== undefined) {
    chips.push({ key: 'countsTowardSkp', label: filters.countsTowardSkp ? 'Masuk capaian SKP' : 'Tidak masuk SKP' });
  }
  if (filters.category) chips.push({ key: 'category', label: `Kategori: ${filters.category}` });
  if (filters.tag) chips.push({ key: 'tag', label: `Tag: ${filters.tag}` });
  return chips;
}
