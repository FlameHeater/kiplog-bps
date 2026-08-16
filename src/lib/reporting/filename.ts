import { todayString } from '@/lib/date/date-utils';

// FR-RPT-10: KipLog_<Jenis>_<Periode>_<YYYYMMDD>.<ext>
export function buildReportFilename(jenis: string, periode: string, ext: string): string {
  const stamp = todayString().split('-').join('');
  return `KipLog_${jenis}_${periode}_${stamp}.${ext}`;
}

// "2026-08-02" -> "20260802"; a range collapses to "20260802-20260805".
export function periodToFilenameSegment(startDate: string, endDate: string): string {
  const start = startDate.split('-').join('');
  if (startDate === endDate) return start;
  return `${start}-${endDate.split('-').join('')}`;
}
