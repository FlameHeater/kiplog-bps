import { describe, expect, it } from 'vitest';
import { groupActivitiesByDate, groupActivitiesByPlan } from '@/lib/services/kipapp-ready-grouping';
import type { Activity, PerformancePlan } from '@/types';

function activity(id: string, date: string, startTime: string, planId: string | null): Activity {
  return {
    id,
    date,
    startTime,
    endTime: startTime,
    description: `Kegiatan ${id}`,
    progress: 100,
    achievement: 'Selesai',
    evidenceLink: null,
    countsTowardSkp: true,
    year: 2026,
    skpPeriod: '2026-08',
    performancePlanId: planId,
    durationMinutes: 60,
    status: 'complete',
    evidenceLinkStatus: 'none',
    tags: [],
    rbAreas: [],
    evidenceCount: 0,
    reportedAt: null,
    sentForReview: false,
    templateId: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  } as Activity;
}

const RK_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RK_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const planById = new Map<string, PerformancePlan>([
  [RK_A, { id: RK_A, name: 'RK A', sortOrder: 5 } as PerformancePlan],
  [RK_B, { id: RK_B, name: 'RK B', sortOrder: 2 } as PerformancePlan],
]);

// Sengaja acak: urutan masukan tidak boleh menentukan urutan keluaran.
const activities: Activity[] = [
  activity('c', '2026-08-17', '13:00', RK_B),
  activity('a', '2026-08-15', '08:00', RK_A),
  activity('d', '2026-08-15', '07:00', RK_B),
  activity('b', '2026-08-16', '09:00', RK_A),
  activity('e', '2026-08-16', '10:00', null),
];

describe('groupActivitiesByPlan', () => {
  it('mengelompokkan per RK dan mengurutkan grup mengikuti sortOrder RK', () => {
    const groups = groupActivitiesByPlan(activities, planById);
    expect(groups.map((g) => g.plan?.name ?? null)).toEqual(['RK B', 'RK A', null]);
  });

  it('menaruh kegiatan tanpa RK di urutan terakhir', () => {
    // Kegiatan itu belum bisa dipindahkan ke KipApp sama sekali, jadi tidak
    // boleh menghalangi yang sudah siap.
    const groups = groupActivitiesByPlan(activities, planById);
    expect(groups[groups.length - 1]?.plan).toBeNull();
  });

  it('mengurutkan kegiatan di dalam satu RK menurut tanggal lalu jam', () => {
    const groups = groupActivitiesByPlan(activities, planById);
    const rkB = groups.find((g) => g.plan?.name === 'RK B')!;
    expect(rkB.activities.map((a) => a.id)).toEqual(['d', 'c']);
  });

  it('membalik urutan tanggal di dalam RK saat diminta terbaru dulu', () => {
    const groups = groupActivitiesByPlan(activities, planById, 'desc');
    const rkA = groups.find((g) => g.plan?.name === 'RK A')!;
    expect(rkA.activities.map((a) => a.id)).toEqual(['b', 'a']);
  });

  it('tidak mengubah urutan grup RK saat urutan tanggal dibalik', () => {
    // Urutan RK ditentukan sortOrder-nya, bukan tanggal isinya.
    const groups = groupActivitiesByPlan(activities, planById, 'desc');
    expect(groups.map((g) => g.plan?.name ?? null)).toEqual(['RK B', 'RK A', null]);
  });
});

describe('groupActivitiesByDate', () => {
  it('mengelompokkan per tanggal, terlama dulu secara bawaan', () => {
    const groups = groupActivitiesByDate(activities);
    expect(groups.map((g) => g.date)).toEqual(['2026-08-15', '2026-08-16', '2026-08-17']);
  });

  it('membalik urutan hari saat diminta terbaru dulu', () => {
    const groups = groupActivitiesByDate(activities, 'desc');
    expect(groups.map((g) => g.date)).toEqual(['2026-08-17', '2026-08-16', '2026-08-15']);
  });

  it('menggabungkan kegiatan lintas RK pada hari yang sama', () => {
    const groups = groupActivitiesByDate(activities);
    const day = groups.find((g) => g.date === '2026-08-16')!;
    expect(day.activities.map((a) => a.id)).toEqual(['b', 'e']);
  });

  it('menjaga jam tetap menaik di dalam satu hari walau urutan hari dibalik', () => {
    // Membalik urutan jam tidak membantu apa pun saat menyalin kegiatan sehari.
    const groups = groupActivitiesByDate(activities, 'desc');
    const day = groups.find((g) => g.date === '2026-08-15')!;
    expect(day.activities.map((a) => a.startTime)).toEqual(['07:00', '08:00']);
  });

  it('tidak kehilangan satu kegiatan pun, termasuk yang tanpa RK', () => {
    const groups = groupActivitiesByDate(activities);
    const ids = groups.flatMap((g) => g.activities.map((a) => a.id)).sort();
    expect(ids).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});
