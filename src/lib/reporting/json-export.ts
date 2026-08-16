import type { Activity, Evidence, PerformancePlan } from '@/types';
import { buildActivityReportRows } from './activity-rows';
import { formatDateString } from '@/lib/date/date-utils';

// FR-RPT-06 — same row shape as the Excel/CSV exports, dates as plain "YYYY-MM-DD" strings.
export function generateActivityJson(
  activities: Activity[],
  planById: Map<string, PerformancePlan>,
  evidenceByActivityId: Map<string, Evidence[]>
): Blob {
  const rows = buildActivityReportRows(activities, planById, evidenceByActivityId).map((row) => ({
    ...row,
    Tanggal: formatDateString(row.Tanggal),
  }));
  return new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
}
