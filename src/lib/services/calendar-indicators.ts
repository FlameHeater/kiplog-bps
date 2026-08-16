import type { Activity } from '@/types';
import type { WorkdayConfig } from '@/lib/date/workdays';
import { getWeekday } from '@/lib/date/date-utils';

export interface DayIndicator {
  date: string;
  isWorkday: boolean;
  activityCount: number;
  evidenceCount: number;
  hasDraft: boolean;
  hasLowProgress: boolean; // any activity progress < 100
  hasNoEvidence: boolean; // any activity with evidenceCount === 0
  hasNoEvidenceLink: boolean; // any activity with evidenceLink === null
  allCompleteWithLink: boolean; // every activity progress 100 + has evidenceLink
  isPastWorkdayEmpty: boolean; // workday, on/before today, zero activities
}

/** §10.2 — one indicator summary per calendar cell, pure/testable. */
export function computeDayIndicator(
  date: string,
  activitiesOnDate: Activity[],
  config: WorkdayConfig,
  today: string
): DayIndicator {
  const isWorkday = config.workdays.includes(getWeekday(date)) && !config.holidays.includes(date);
  const nonArchived = activitiesOnDate.filter((a) => a.status !== 'archived');

  const hasDraft = nonArchived.some((a) => a.status === 'draft');
  const hasLowProgress = nonArchived.some((a) => a.progress < 100);
  const hasNoEvidence = nonArchived.some((a) => a.evidenceCount === 0);
  const hasNoEvidenceLink = nonArchived.some((a) => a.evidenceLink === null);
  const allCompleteWithLink =
    nonArchived.length > 0 && nonArchived.every((a) => a.progress === 100 && a.evidenceLink !== null);

  return {
    date,
    isWorkday,
    activityCount: nonArchived.length,
    evidenceCount: nonArchived.reduce((sum, a) => sum + a.evidenceCount, 0),
    hasDraft,
    hasLowProgress,
    hasNoEvidence,
    hasNoEvidenceLink,
    allCompleteWithLink,
    isPastWorkdayEmpty: isWorkday && nonArchived.length === 0 && date <= today,
  };
}
