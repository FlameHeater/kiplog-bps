import { describe, expect, it } from 'vitest';
import { duplicateActivity, duplicateActivityToRange } from '@/lib/services/duplicate-activity';
import type { Activity, AppSettings } from '@/types';

const settings: AppSettings = {
  id: 'settings',
  workdays: [1, 2, 3, 4, 5],
  holidays: [],
  requireEvidenceForReady: true,
  requireEvidenceLinkForReady: true,
  defaultStartTime: '08:00',
  defaultEndTime: '16:00',
  defaultCountsTowardSkp: true,
  theme: 'system',
  maxFileSizeMb: 10,
  autoCompressImages: true,
  monthEndReminderDays: 5,
  lastBackupAt: null,
  schemaVersion: 1,
};

const source: Activity = {
  id: 'orig',
  date: '2026-08-07', // Jumat
  startTime: '08:00',
  endTime: '10:00',
  description: 'Rapat rutin',
  progress: 100,
  achievement: 'Terselesaikannya rapat rutin',
  evidenceLink: 'https://drive.google.com/file/x',
  countsTowardSkp: true,
  year: 2026,
  skpPeriod: '2026-08',
  performancePlanId: 'plan-1',
  durationMinutes: 120,
  status: 'reported',
  evidenceLinkStatus: 'uploaded',
  location: 'Kantor',
  tags: ['Rapat'],
  rbAreas: [],
  evidenceCount: 3,
  reportedAt: '2026-08-07T12:00:00.000Z',
  sentForReview: true,
  templateId: null,
  createdAt: '2026-08-07T08:00:00.000Z',
  updatedAt: '2026-08-07T10:00:00.000Z',
};

describe('duplicateActivity', () => {
  it('never copies the evidence link or evidence count', () => {
    const copy = duplicateActivity(source, settings);
    expect(copy.evidenceLink).toBeNull();
    expect(copy.evidenceCount).toBe(0);
    expect(copy.evidenceLinkStatus).toBe('none');
  });

  it('resets report/lock state so the copy is freely editable', () => {
    const copy = duplicateActivity(source, settings);
    expect(copy.status).toBe('draft');
    expect(copy.sentForReview).toBe(false);
    expect(copy.reportedAt).toBeNull();
  });

  it('copies description/plan/achievement/tags/location/times/status capaian', () => {
    const copy = duplicateActivity(source, settings);
    expect(copy.description).toBe(source.description);
    expect(copy.performancePlanId).toBe(source.performancePlanId);
    expect(copy.achievement).toBe(source.achievement);
    expect(copy.tags).toEqual(source.tags);
    expect(copy.location).toBe(source.location);
    expect(copy.startTime).toBe(source.startTime);
    expect(copy.endTime).toBe(source.endTime);
    expect(copy.countsTowardSkp).toBe(source.countsTowardSkp);
  });

  it('defaults the date to the next workday', () => {
    const copy = duplicateActivity(source, settings);
    expect(copy.date).toBe('2026-08-10'); // next Monday after Jumat 2026-08-07
    expect(copy.skpPeriod).toBe('2026-08');
  });

  it('assigns a fresh id', () => {
    const copy = duplicateActivity(source, settings);
    expect(copy.id).not.toBe(source.id);
  });
});

describe('duplicateActivityToRange (FR-ACT-12)', () => {
  it('creates one copy per calendar day when not skipping non-workdays', () => {
    const copies = duplicateActivityToRange(source, settings, '2026-08-10', '2026-08-14', false);
    expect(copies.map((c) => c.date)).toEqual([
      '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14',
    ]);
  });

  it('skips weekends when skipNonWorkdays is true', () => {
    // 2026-08-08/09 is Sat/Sun.
    const copies = duplicateActivityToRange(source, settings, '2026-08-07', '2026-08-11', true);
    expect(copies.map((c) => c.date)).toEqual(['2026-08-07', '2026-08-10', '2026-08-11']);
  });

  it('skips configured holidays too', () => {
    const withHoliday = { ...settings, holidays: ['2026-08-10'] };
    const copies = duplicateActivityToRange(source, withHoliday, '2026-08-07', '2026-08-11', true);
    expect(copies.map((c) => c.date)).toEqual(['2026-08-07', '2026-08-11']);
  });

  it('never copies evidence for any date in the range', () => {
    const copies = duplicateActivityToRange(source, settings, '2026-08-10', '2026-08-11', false);
    expect(copies.every((c) => c.evidenceLink === null && c.evidenceCount === 0)).toBe(true);
  });

  it('spans multiple months correctly', () => {
    const copies = duplicateActivityToRange(source, settings, '2026-08-31', '2026-09-02', false);
    expect(copies.map((c) => c.date)).toEqual(['2026-08-31', '2026-09-01', '2026-09-02']);
  });
});
