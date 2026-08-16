import { describe, expect, it } from 'vitest';
import { orderPlansForCombobox } from '@/lib/services/plan-ordering';
import type { PerformancePlan } from '@/types';

function makePlan(overrides: Partial<PerformancePlan>): PerformancePlan {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    year: 2026,
    type: 'Utama',
    name: 'RK',
    category: null,
    keywords: [],
    tags: [],
    color: '#000',
    isActive: true,
    isFavorite: false,
    sortOrder: 0,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('orderPlansForCombobox', () => {
  it('puts favorites first and never duplicates them elsewhere', () => {
    const fav = makePlan({ id: 'fav', isFavorite: true, teamName: 'Tim A' });
    const other = makePlan({ id: 'other', teamName: 'Tim A' });
    const result = orderPlansForCombobox([fav, other]);

    expect(result.favorites.map((p) => p.id)).toEqual(['fav']);
    expect(result.byTeam.get('Tim A')?.map((p) => p.id)).toEqual(['other']);
  });

  it('caps recent and frequent at 5 each and excludes overlap', () => {
    const recentPlans = Array.from({ length: 7 }, (_, i) =>
      makePlan({ id: `recent-${i}`, lastUsedAt: `2026-08-${10 + i}T00:00:00.000Z`, teamName: 'X' })
    );
    const result = orderPlansForCombobox(recentPlans);
    expect(result.recent).toHaveLength(5);
    // Most recently used first.
    expect(result.recent[0]?.id).toBe('recent-6');
    // Remainder falls through to the team group.
    expect(result.byTeam.get('X')).toHaveLength(2);
  });

  it('groups the untouched remainder by team', () => {
    const a = makePlan({ id: 'a', teamName: 'Tim A' });
    const b = makePlan({ id: 'b', teamName: 'Tim B' });
    const result = orderPlansForCombobox([a, b]);
    expect(result.byTeam.size).toBe(2);
  });
});
