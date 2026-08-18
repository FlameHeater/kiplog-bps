import type { Activity, PerformancePlan } from '@/types';

/** Sumbu pengelompokan kartu di halaman KipApp Ready. */
export type GroupBy = 'rk' | 'tanggal';

/**
 * Arah urutan tanggal. Berlaku di KEDUA mode, bukan hanya mode tanggal: di
 * dalam satu RK pun kegiatan tetap berurutan waktu, dan pilihan ini yang
 * menentukan arahnya.
 */
export type DateOrder = 'asc' | 'desc';

export interface PlanGroup {
  plan: PerformancePlan | null;
  activities: Activity[];
}

export interface DateGroup {
  date: string;
  activities: Activity[];
}

function byDateThenTime(a: Activity, b: Activity): number {
  return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
}

/**
 * FR-KAR-02 — kegiatan dikelompokkan per Rencana Kinerja, mengikuti urutan
 * kerja KipApp: satu RK dipilih di halaman KipApp, lalu kegiatannya diinput
 * satu per satu.
 *
 * Grup "Tanpa Rencana Kinerja" selalu di urutan terakhir: kegiatan itu belum
 * bisa dipindahkan ke KipApp sama sekali, jadi menaruhnya di atas hanya
 * menghalangi pekerjaan yang sudah siap.
 */
export function groupActivitiesByPlan(
  activities: Activity[],
  planById: Map<string, PerformancePlan>,
  dateOrder: DateOrder = 'asc'
): PlanGroup[] {
  const direction = dateOrder === 'asc' ? 1 : -1;
  const byPlan = new Map<string, Activity[]>();

  for (const activity of activities) {
    const key = activity.performancePlanId ?? '__none__';
    const list = byPlan.get(key) ?? [];
    list.push(activity);
    byPlan.set(key, list);
  }

  const result: PlanGroup[] = [];
  for (const [key, list] of byPlan) {
    list.sort((a, b) => direction * byDateThenTime(a, b));
    result.push({
      plan: key === '__none__' ? null : (planById.get(key) ?? null),
      activities: list,
    });
  }

  result.sort((a, b) => {
    if (!a.plan) return 1;
    if (!b.plan) return -1;
    return a.plan.sortOrder - b.plan.sortOrder;
  });
  return result;
}

/**
 * Kegiatan dikelompokkan per tanggal.
 *
 * Berguna saat mengejar ketertinggalan input: KipApp mencatat kinerja harian,
 * jadi menyusun ulang per hari membuat urutan salinnya sama dengan urutan
 * kejadiannya, lintas RK.
 */
export function groupActivitiesByDate(
  activities: Activity[],
  dateOrder: DateOrder = 'asc'
): DateGroup[] {
  const direction = dateOrder === 'asc' ? 1 : -1;
  const byDate = new Map<string, Activity[]>();

  for (const activity of activities) {
    const list = byDate.get(activity.date) ?? [];
    list.push(activity);
    byDate.set(activity.date, list);
  }

  const result: DateGroup[] = [];
  for (const [date, list] of byDate) {
    // Di dalam satu hari jam SELALU menaik, tidak ikut `dateOrder`: membalik
    // urutan jam tidak membantu apa pun saat menyalin kegiatan sehari.
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    result.push({ date, activities: list });
  }

  result.sort((a, b) => direction * a.date.localeCompare(b.date));
  return result;
}
