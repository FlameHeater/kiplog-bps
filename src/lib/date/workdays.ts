// PRD §12.4 — pure functions, no React/Dexie dependency. Domain dates stay
// as "YYYY-MM-DD" strings everywhere (§9.1); Date objects are only used as
// transient local-time scratch values inside this module, never persisted
// or returned.

import { formatDateString, parseDateString } from './date-utils';

export interface WorkdayConfig {
  workdays: number[]; // 0=Minggu..6=Sabtu, matches Date#getDay()
  holidays: string[]; // "YYYY-MM-DD"
}

function isWorkday(date: Date, config: WorkdayConfig, holidaySet: Set<string>): boolean {
  return config.workdays.includes(date.getDay()) && !holidaySet.has(formatDateString(date));
}

/**
 * Every workday in the given month, optionally capped to `<= upToDate`
 * (inclusive) for coverage calculations. Without `upToDate`, returns the
 * full month — used for "sisa hari bulan" style forward-looking counts.
 */
export function getWorkdaysInMonth(
  year: number,
  month: number, // 1-12
  config: WorkdayConfig,
  upToDate?: string
): string[] {
  const holidaySet = new Set(config.holidays);
  const cap = upToDate ? parseDateString(upToDate) : null;
  const daysInMonth = new Date(year, month, 0).getDate();
  const result: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (cap && date > cap) break;
    if (isWorkday(date, config, holidaySet)) {
      result.push(formatDateString(date));
    }
  }
  return result;
}

/** Workdays strictly after `fromDateExclusive` through the end of that month. */
export function getRemainingWorkdaysInMonth(
  year: number,
  month: number,
  config: WorkdayConfig,
  fromDateExclusive: string
): string[] {
  const holidaySet = new Set(config.holidays);
  const from = parseDateString(fromDateExclusive);
  const daysInMonth = new Date(year, month, 0).getDate();
  const result: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date <= from) continue;
    if (isWorkday(date, config, holidaySet)) {
      result.push(formatDateString(date));
    }
  }
  return result;
}

/** First workday strictly after `fromDate` — used as the default date when duplicating (FR-ACT-11). */
export function getNextWorkday(fromDate: string, config: WorkdayConfig): string {
  const holidaySet = new Set(config.holidays);
  let cursor = parseDateString(fromDate);
  for (let i = 0; i < 60; i++) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    if (isWorkday(cursor, config, holidaySet)) {
      return formatDateString(cursor);
    }
  }
  // Fallback (should be unreachable with a sane workdays config): just the next calendar day.
  return formatDateString(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1));
}

export function countFilledWorkdays(workdays: string[], activityDates: Iterable<string>): number {
  const workdaySet = new Set(workdays);
  const filled = new Set<string>();
  for (const date of activityDates) {
    if (workdaySet.has(date)) filled.add(date);
  }
  return filled.size;
}

/** 0 when the denominator is 0 — never NaN/Infinity. */
export function calculateCoverage(filledWorkdays: number, totalWorkdays: number): number {
  if (totalWorkdays === 0) return 0;
  return Math.round((filledWorkdays / totalWorkdays) * 100);
}
