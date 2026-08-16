import type { Activity, AppSettings } from '@/types';
import { getNextWorkday, getWorkdaysInMonth, type WorkdayConfig } from '@/lib/date/workdays';
import { deriveYearAndSkpPeriod } from './activity-fields';

function copyToDate(source: Activity, date: string): Activity {
  const now = new Date().toISOString();
  const { year, skpPeriod } = deriveYearAndSkpPeriod(date);
  return {
    ...source,
    id: crypto.randomUUID(),
    date,
    year,
    skpPeriod,
    evidenceLink: null,
    evidenceLinkStatus: 'none',
    evidenceCount: 0,
    status: 'draft',
    reportedAt: null,
    sentForReview: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * FR-ACT-11: copies description/RK/achievement/tags/location/times/status
 * capaian/RB areas. Date defaults to the next workday. Evidence and the
 * evidence link are NEVER copied — a duplicated activity always starts at
 * evidenceLinkStatus 'none' with no evidence count.
 */
export function duplicateActivity(source: Activity, settings: AppSettings): Activity {
  return copyToDate(source, getNextWorkday(source.date, settings));
}

/**
 * FR-ACT-12: one copy per date in [startDate, endDate]. `skipNonWorkdays`
 * excludes weekends/holidays using the same WorkdayConfig as the calendar.
 */
export function duplicateActivityToRange(
  source: Activity,
  settings: WorkdayConfig,
  startDate: string,
  endDate: string,
  skipNonWorkdays: boolean
): Activity[] {
  const [startYear, startMonth] = startDate.split('-').map(Number) as [number, number];
  const dates: string[] = [];

  if (skipNonWorkdays) {
    // getWorkdaysInMonth is month-scoped; walk every month the range spans.
    let year = startYear;
    let month = startMonth;
    while (`${year}-${String(month).padStart(2, '0')}` <= endDate.slice(0, 7)) {
      const monthWorkdays = getWorkdaysInMonth(year, month, settings);
      dates.push(...monthWorkdays.filter((d) => d >= startDate && d <= endDate));
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  } else {
    let cursor = startDate;
    while (cursor <= endDate) {
      dates.push(cursor);
      const [y, m, d] = cursor.split('-').map(Number) as [number, number, number];
      const next = new Date(y, m - 1, d + 1);
      cursor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    }
  }

  return dates.map((date) => copyToDate(source, date));
}
