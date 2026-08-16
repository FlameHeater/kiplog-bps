import { addDays, formatDateString, getWeekday, parseDateString, todayString } from '@/lib/date/date-utils';

export type ReportPeriodKind = 'harian' | 'mingguan' | 'bulanan' | 'custom';

export interface ReportPeriod {
  kind: ReportPeriodKind;
  startDate: string;
  endDate: string;
}

/** Monday..Sunday range containing `date`. */
export function weekRangeContaining(date: string): { start: string; end: string } {
  const weekday = getWeekday(date); // 0=Sun..6=Sat
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const start = addDays(date, mondayOffset);
  const end = addDays(start, 6);
  return { start, end };
}

/** First..last calendar day of the month containing `date`. */
export function monthRangeContaining(date: string): { start: string; end: string } {
  const d = parseDateString(date);
  const start = formatDateString(new Date(d.getFullYear(), d.getMonth(), 1));
  const end = formatDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return { start, end };
}

export function buildReportPeriod(kind: ReportPeriodKind, custom?: { start: string; end: string }): ReportPeriod {
  const today = todayString();
  if (kind === 'harian') return { kind, startDate: today, endDate: today };
  if (kind === 'mingguan') {
    const { start, end } = weekRangeContaining(today);
    return { kind, startDate: start, endDate: end };
  }
  if (kind === 'bulanan') {
    const { start, end } = monthRangeContaining(today);
    return { kind, startDate: start, endDate: end };
  }
  return { kind, startDate: custom?.start ?? today, endDate: custom?.end ?? today };
}

export const REPORT_PERIOD_LABELS: Record<ReportPeriodKind, string> = {
  harian: 'Harian',
  mingguan: 'Mingguan',
  bulanan: 'Bulanan',
  custom: 'Kustom',
};
