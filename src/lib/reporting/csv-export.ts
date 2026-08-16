import type { Activity, Evidence, PerformancePlan } from '@/types';
import { buildActivityReportRows, type ActivityReportRow } from './activity-rows';
import { formatDateString } from '@/lib/date/date-utils';

function csvCell(value: string | number): string {
  const text = typeof value === 'number' ? String(value) : value;
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function rowToCsvValues(row: ActivityReportRow): (string | number)[] {
  return Object.entries(row).map(([key, value]) => (key === 'Tanggal' ? formatDateString(value as Date) : (value as string | number)));
}

// FR-RPT-06: UTF-8 BOM so Excel on Windows opens accented/Indonesian text correctly.
export function generateActivityCsv(
  activities: Activity[],
  planById: Map<string, PerformancePlan>,
  evidenceByActivityId: Map<string, Evidence[]>
): Blob {
  const rows = buildActivityReportRows(activities, planById, evidenceByActivityId);
  const header = rows.length > 0 ? Object.keys(rows[0] as ActivityReportRow) : [];
  const lines = [header.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push(rowToCsvValues(row).map(csvCell).join(','));
  }
  const csv = '﻿' + lines.join('\r\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}
