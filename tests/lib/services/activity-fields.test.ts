import { describe, expect, it } from 'vitest';
import {
  buildActivityFromForm,
  calculateDurationMinutes,
  deriveYearAndSkpPeriod,
} from '@/lib/services/activity-fields';
import type { Activity, ActivityEditFormValues } from '@/types';

describe('deriveYearAndSkpPeriod', () => {
  it('derives year and YYYY-MM from a date string', () => {
    expect(deriveYearAndSkpPeriod('2026-08-02')).toEqual({ year: 2026, skpPeriod: '2026-08' });
  });
});

describe('calculateDurationMinutes', () => {
  it('computes minutes between two HH:mm times', () => {
    expect(calculateDurationMinutes('08:00', '10:30')).toBe(150);
  });
});

const baseValues: ActivityEditFormValues = {
  date: '2026-08-02',
  startTime: '08:00',
  endTime: '10:30',
  description: 'Melakukan Input Petugas SNLIK 2026 di Website Provinsi',
  progress: 100,
  achievement: 'Terselesaikannya Melakukan Input Petugas SNLIK 2026 di Website Provinsi',
  evidenceLink: null,
  countsTowardSkp: true,
  performancePlanId: null,
  location: undefined,
  tags: [],
  rbAreas: [],
};

describe('buildActivityFromForm', () => {
  it('creates a new activity with derived fields and draft defaults', () => {
    const activity = buildActivityFromForm(baseValues);
    expect(activity.year).toBe(2026);
    expect(activity.skpPeriod).toBe('2026-08');
    expect(activity.durationMinutes).toBe(150);
    expect(activity.status).toBe('draft');
    expect(activity.sentForReview).toBe(false);
    expect(activity.evidenceCount).toBe(0);
  });

  it('preserves KipLog-only fields from an existing record when editing', () => {
    const existing: Activity = {
      ...buildActivityFromForm(baseValues),
      status: 'ready_to_report',
      evidenceCount: 3,
      sentForReview: false,
      templateId: 'tmpl-1',
    };

    const edited = buildActivityFromForm({ ...baseValues, progress: 80 }, existing);
    expect(edited.id).toBe(existing.id);
    expect(edited.status).toBe('ready_to_report');
    expect(edited.evidenceCount).toBe(3);
    expect(edited.templateId).toBe('tmpl-1');
    expect(edited.progress).toBe(80);
    expect(edited.createdAt).toBe(existing.createdAt);
  });
});
