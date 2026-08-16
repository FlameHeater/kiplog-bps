import { describe, expect, it } from 'vitest';
import { computeDayIndicator } from '@/lib/services/calendar-indicators';
import type { Activity } from '@/types';
import type { WorkdayConfig } from '@/lib/date/workdays';

const config: WorkdayConfig = { workdays: [1, 2, 3, 4, 5], holidays: [] };

function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    id: crypto.randomUUID(),
    date: '2026-08-03',
    startTime: '08:00',
    endTime: '09:00',
    description: 'x',
    progress: 100,
    achievement: 'x',
    evidenceLink: 'https://drive.google.com/x',
    countsTowardSkp: true,
    year: 2026,
    skpPeriod: '2026-08',
    performancePlanId: null,
    durationMinutes: 60,
    status: 'complete',
    evidenceLinkStatus: 'uploaded',
    tags: [],
    rbAreas: [],
    evidenceCount: 1,
    reportedAt: null,
    sentForReview: false,
    templateId: null,
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeDayIndicator', () => {
  it('flags a past workday with zero activities', () => {
    const result = computeDayIndicator('2026-08-03', [], config, '2026-08-10');
    expect(result.isPastWorkdayEmpty).toBe(true);
  });

  it('does not flag a weekend as past-empty even if in the past', () => {
    const result = computeDayIndicator('2026-08-01', [], config, '2026-08-10'); // Sabtu
    expect(result.isWorkday).toBe(false);
    expect(result.isPastWorkdayEmpty).toBe(false);
  });

  it('marks allCompleteWithLink only when every activity is 100% with a link', () => {
    const good = computeDayIndicator('2026-08-03', [makeActivity({})], config, '2026-08-10');
    expect(good.allCompleteWithLink).toBe(true);

    const partial = computeDayIndicator(
      '2026-08-03',
      [makeActivity({}), makeActivity({ progress: 50 })],
      config,
      '2026-08-10'
    );
    expect(partial.allCompleteWithLink).toBe(false);
    expect(partial.hasLowProgress).toBe(true);
  });

  it('flags missing evidence and missing evidence link independently', () => {
    const result = computeDayIndicator(
      '2026-08-03',
      [makeActivity({ evidenceCount: 0, evidenceLink: null })],
      config,
      '2026-08-10'
    );
    expect(result.hasNoEvidence).toBe(true);
    expect(result.hasNoEvidenceLink).toBe(true);
  });

  it('ignores archived activities entirely', () => {
    const result = computeDayIndicator(
      '2026-08-03',
      [makeActivity({ status: 'archived', progress: 10, evidenceLink: null })],
      config,
      '2026-08-10'
    );
    expect(result.activityCount).toBe(0);
    expect(result.hasLowProgress).toBe(false);
  });
});
