import { describe, expect, it } from 'vitest';
import {
  applyActivityFilters,
  describeActiveFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
} from '@/lib/services/activity-filters';
import type { Activity, PerformancePlan } from '@/types';

function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    id: crypto.randomUUID(),
    date: '2026-08-16',
    startTime: '08:00',
    endTime: '09:00',
    description: 'x',
    progress: 50,
    achievement: '',
    evidenceLink: null,
    countsTowardSkp: true,
    year: 2026,
    skpPeriod: '2026-08',
    performancePlanId: null,
    durationMinutes: 60,
    status: 'draft',
    evidenceLinkStatus: 'none',
    tags: [],
    rbAreas: [],
    evidenceCount: 0,
    reportedAt: null,
    sentForReview: false,
    templateId: null,
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
    ...overrides,
  };
}

const plan: PerformancePlan = {
  id: 'plan-1',
  year: 2026,
  type: 'Utama',
  name: 'RK Uji',
  category: 'Kesra',
  keywords: [],
  tags: [],
  color: '#000',
  isActive: true,
  isFavorite: false,
  sortOrder: 1,
  usageCount: 0,
  lastUsedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const planById = new Map([['plan-1', plan]]);

describe('applyActivityFilters', () => {
  it('filters by date range', () => {
    const activities = [makeActivity({ date: '2026-08-01' }), makeActivity({ date: '2026-08-20' })];
    const result = applyActivityFilters(activities, { dateFrom: '2026-08-10' }, planById);
    expect(result).toHaveLength(1);
    expect(result[0]?.date).toBe('2026-08-20');
  });

  it('filters by evidence presence', () => {
    const activities = [makeActivity({ evidenceCount: 0 }), makeActivity({ evidenceCount: 2 })];
    expect(applyActivityFilters(activities, { hasEvidence: true }, planById)).toHaveLength(1);
    expect(applyActivityFilters(activities, { hasEvidence: false }, planById)).toHaveLength(1);
  });

  it('filters by plan type via the plan lookup', () => {
    const activities = [makeActivity({ performancePlanId: 'plan-1' }), makeActivity({ performancePlanId: null })];
    const result = applyActivityFilters(activities, { planType: 'Utama' }, planById);
    expect(result).toHaveLength(1);
  });

  it('combines multiple filters with AND semantics', () => {
    const activities = [
      makeActivity({ progress: 100, status: 'reported' }),
      makeActivity({ progress: 100, status: 'draft' }),
      makeActivity({ progress: 50, status: 'reported' }),
    ];
    const result = applyActivityFilters(activities, { progressMin: 100, status: 'reported' }, planById);
    expect(result).toHaveLength(1);
  });
});

describe('describeActiveFilters', () => {
  it('produces one chip per active filter', () => {
    const chips = describeActiveFilters({ status: 'draft', hasEvidence: true }, planById);
    expect(chips).toHaveLength(2);
  });

  it('produces nothing when no filters are active', () => {
    expect(describeActiveFilters({}, planById)).toHaveLength(0);
  });
});

describe('filter <-> URLSearchParams round-trip (FR-SCH-06)', () => {
  it('round-trips a mix of string/number/boolean filters', () => {
    const original = { status: 'draft' as const, progressMin: 20, hasEvidence: true, tag: 'SE2026' };
    const params = filtersToSearchParams(original);
    const restored = filtersFromSearchParams(params);
    expect(restored).toEqual(original);
  });

  it('produces an empty params object for empty filters', () => {
    expect(filtersToSearchParams({}).toString()).toBe('');
  });
});
