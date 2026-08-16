import { formatIndonesianWeekday } from '@/lib/date/date-utils';
import { ACTIVITY_STATUS_LABELS } from '@/features/activities/activity-status-labels';
import type { Activity, Evidence, PerformancePlan } from '@/types';

// §10.12.1 copy-mode label, reused for the "Status Capaian (Capaian SKP)" report column.
export function countsTowardSkpLabel(activity: Activity): string {
  return activity.countsTowardSkp ? 'Masuk capaian SKP' : 'Tidak masuk capaian SKP';
}

// §13.2 — one row per activity, exact column order.
export interface ActivityReportRow {
  Tanggal: Date;
  Hari: string;
  'Jam Mulai': string;
  'Jam Selesai': string;
  'Durasi (menit)': number;
  'Periode SKP': string;
  'Rencana Kinerja': string;
  'Jenis RK': string;
  Kegiatan: string;
  Capaian: string;
  Progress: number;
  'Status Capaian (Capaian SKP)': string;
  'Link Bukti Dukung': string;
  'Status KipLog': string;
  'Jumlah Bukti': number;
  'Nama Bukti': string;
  Kategori: string;
  Tag: string;
  Lokasi: string;
  Catatan: string;
}

export function buildActivityReportRows(
  activities: Activity[],
  planById: Map<string, PerformancePlan>,
  evidenceByActivityId: Map<string, Evidence[]>
): ActivityReportRow[] {
  return activities
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .map((activity) => {
      const plan = activity.performancePlanId ? planById.get(activity.performancePlanId) : undefined;
      const evidence = evidenceByActivityId.get(activity.id) ?? [];
      const [year, month, day] = activity.date.split('-').map(Number) as [number, number, number];

      return {
        Tanggal: new Date(year, month - 1, day),
        Hari: formatIndonesianWeekday(activity.date),
        'Jam Mulai': activity.startTime,
        'Jam Selesai': activity.endTime,
        'Durasi (menit)': activity.durationMinutes,
        'Periode SKP': activity.skpPeriod,
        'Rencana Kinerja': plan ? (plan.displayName ?? plan.name) : '',
        'Jenis RK': plan?.type ?? '',
        Kegiatan: activity.description,
        Capaian: activity.achievement,
        Progress: activity.progress,
        'Status Capaian (Capaian SKP)': countsTowardSkpLabel(activity),
        'Link Bukti Dukung': activity.evidenceLink ?? '',
        'Status KipLog': ACTIVITY_STATUS_LABELS[activity.status],
        'Jumlah Bukti': evidence.length,
        'Nama Bukti': evidence.map((e) => e.fileName ?? e.linkTitle ?? e.url ?? '').filter(Boolean).join('; '),
        Kategori: [...new Set(evidence.map((e) => e.category))].join('; '),
        Tag: activity.tags.join('; '),
        Lokasi: activity.location ?? '',
        Catatan: activity.notes ?? '',
      };
    });
}
