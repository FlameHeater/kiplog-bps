import { describe, expect, it } from 'vitest';
import { searchAll } from '@/lib/services/global-search';
import type { Activity, Evidence, PerformancePlan } from '@/types';

function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    id: crypto.randomUUID(),
    date: '2026-08-16',
    startTime: '08:00',
    endTime: '09:00',
    description: '',
    progress: 0,
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

function makeEvidence(overrides: Partial<Evidence>): Evidence {
  return {
    id: crypto.randomUUID(),
    activityId: null,
    kind: 'file',
    caption: '',
    category: 'lainnya',
    sortOrder: 0,
    inboxStatus: 'unassigned',
    capturedAt: null,
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
    ...overrides,
  };
}

describe('searchAll', () => {
  it('finds an activity by description substring', () => {
    const activities = [makeActivity({ description: 'Melakukan input petugas SNLIK 2026' })];
    const results = searchAll('snlik', activities, [], []);
    expect(results).toHaveLength(1);
    expect(results[0]?.type).toBe('activity');
  });

  it('finds an activity by RK name even when description does not match', () => {
    const plan: PerformancePlan = {
      id: 'plan-1',
      year: 2026,
      type: 'Utama',
      name: 'Terlaksananya Kegiatan Statistik Kesejahteraan Rakyat',
      category: null,
      keywords: [],
      tags: [],
      color: '#000',
      isActive: true,
      isFavorite: false,
      sortOrder: 2,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const activities = [makeActivity({ description: 'Rapat koordinasi', performancePlanId: 'plan-1' })];
    const results = searchAll('kesejahteraan', activities, [], [plan]);
    expect(results).toHaveLength(1);
  });

  it('finds evidence by file name', () => {
    const evidence = [makeEvidence({ fileName: 'screenshot-usulan-petugas-snlik.png' })];
    const results = searchAll('usulan-petugas', [], evidence, []);
    expect(results).toHaveLength(1);
    expect(results[0]?.type).toBe('evidence');
  });

  it('finds evidence by caption', () => {
    const evidence = [makeEvidence({ fileName: 'foto.png', caption: 'Bukti kunjungan lapangan' })];
    const results = searchAll('kunjungan lapangan', [], evidence, []);
    expect(results).toHaveLength(1);
  });

  it('is case-insensitive', () => {
    const activities = [makeActivity({ description: 'Monitoring SE2026' })];
    expect(searchAll('se2026', activities, [], [])).toHaveLength(1);
    expect(searchAll('SE2026', activities, [], [])).toHaveLength(1);
  });

  it('returns nothing for an empty query', () => {
    const activities = [makeActivity({ description: 'Apa saja' })];
    expect(searchAll('   ', activities, [], [])).toEqual([]);
  });

  it('builds a snippet with match position for highlighting', () => {
    const activities = [makeActivity({ description: 'Melakukan input petugas SNLIK 2026 di website' })];
    const [result] = searchAll('SNLIK', activities, [], []);
    expect(result?.snippet).toContain('SNLIK');
    expect(result?.matchLength).toBe(5);
  });
});
