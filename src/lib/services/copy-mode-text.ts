import { formatIndonesianDate } from '@/lib/date/date-utils';
import { countsTowardSkpLabel } from '@/lib/reporting/activity-rows';
import type { Activity } from '@/types';

export interface CopyModeField {
  key: string;
  label: string;
  value: string;
}

// FR-KAR-04 — same order as the KipApp Add form.
export function buildCopyModeFields(activity: Activity): CopyModeField[] {
  return [
    { key: 'date', label: 'Tanggal', value: formatIndonesianDate(activity.date) },
    { key: 'startTime', label: 'Jam Mulai', value: activity.startTime },
    { key: 'endTime', label: 'Jam Selesai', value: activity.endTime },
    { key: 'description', label: 'Deskripsi', value: activity.description },
    { key: 'progress', label: 'Progress', value: String(activity.progress) },
    { key: 'achievement', label: 'Capaian', value: activity.achievement },
    { key: 'evidenceLink', label: 'Link Bukti Dukung', value: activity.evidenceLink ?? '' },
    { key: 'countsTowardSkp', label: 'Status Capaian', value: countsTowardSkpLabel(activity) },
  ];
}

// §10.12.1 — exact baku format for the "Salin Semua" button.
export function buildSalinSemuaText(activity: Activity): string {
  return [
    `Tanggal: ${formatIndonesianDate(activity.date)}`,
    `Jam Mulai: ${activity.startTime}`,
    `Jam Selesai: ${activity.endTime}`,
    `Deskripsi Kegiatan: ${activity.description}`,
    `Progress: ${activity.progress}`,
    `Capaian Hasil Kegiatan: ${activity.achievement}`,
    `Link Bukti Dukung: ${activity.evidenceLink ?? ''}`,
    `Status Capaian: ${countsTowardSkpLabel(activity)}`,
  ].join('\n');
}
