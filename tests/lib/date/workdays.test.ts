import { describe, expect, it } from 'vitest';
import {
  calculateCoverage,
  countFilledWorkdays,
  getNextWorkday,
  getRemainingWorkdaysInMonth,
  getWorkdaysInMonth,
  type WorkdayConfig,
} from '@/lib/date/workdays';

const MON_FRI: WorkdayConfig = { workdays: [1, 2, 3, 4, 5], holidays: [] };

describe('getWorkdaysInMonth', () => {
  it('excludes weekends for a Mon-Fri config (Agustus 2026 has 21 hari kerja)', () => {
    // Agustus 2026: 1 Agu = Sabtu, 31 hari, 4 minggu penuh + partial.
    const days = getWorkdaysInMonth(2026, 8, MON_FRI);
    expect(days).toHaveLength(21);
    expect(days).not.toContain('2026-08-01'); // Sabtu
    expect(days).not.toContain('2026-08-02'); // Minggu
  });

  it('excludes configured holidays even if the weekday matches', () => {
    const config: WorkdayConfig = { workdays: [1, 2, 3, 4, 5], holidays: ['2026-08-17'] };
    const days = getWorkdaysInMonth(2026, 8, config);
    expect(days).not.toContain('2026-08-17');
    expect(days).toHaveLength(20);
  });

  it('caps at upToDate inclusive, for coverage-style "so far" counts', () => {
    const days = getWorkdaysInMonth(2026, 8, MON_FRI, '2026-08-10');
    expect(days[days.length - 1]).toBe('2026-08-10');
    expect(days.every((d) => d <= '2026-08-10')).toBe(true);
  });
});

describe('getRemainingWorkdaysInMonth', () => {
  it('only returns workdays strictly after the given date', () => {
    const days = getRemainingWorkdaysInMonth(2026, 8, MON_FRI, '2026-08-28');
    expect(days.every((d) => d > '2026-08-28')).toBe(true);
  });
});

describe('getNextWorkday', () => {
  it('skips the weekend to Monday', () => {
    // 2026-08-07 is Jumat.
    expect(getNextWorkday('2026-08-07', MON_FRI)).toBe('2026-08-10');
  });

  it('skips a configured holiday too', () => {
    const config: WorkdayConfig = { workdays: [1, 2, 3, 4, 5], holidays: ['2026-08-18'] };
    expect(getNextWorkday('2026-08-17', config)).toBe('2026-08-19');
  });
});

describe('countFilledWorkdays', () => {
  it('counts unique workdays that have at least one activity', () => {
    const workdays = getWorkdaysInMonth(2026, 8, MON_FRI);
    const activityDates = ['2026-08-03', '2026-08-03', '2026-08-04', '2026-08-01' /* weekend, ignored */];
    expect(countFilledWorkdays(workdays, activityDates)).toBe(2);
  });
});

describe('calculateCoverage', () => {
  it('computes a rounded percentage', () => {
    expect(calculateCoverage(16, 20)).toBe(80);
  });

  it('returns 0 instead of NaN/Infinity when denominator is 0', () => {
    expect(calculateCoverage(0, 0)).toBe(0);
  });
});
