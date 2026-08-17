import { afterEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import {
  refreshSeedKeywords,
  seedPerformancePlansIfEmpty,
} from '@/lib/services/seed-performance-plans';
import { PERFORMANCE_PLANS_2026 } from '@/data/performance-plans-2026';

afterEach(async () => {
  await db.performancePlans.clear();
});

describe('seedPerformancePlansIfEmpty', () => {
  it('seeds all 40 RK verbatim (DR-01) when the table is empty', async () => {
    const result = await seedPerformancePlansIfEmpty();
    expect(result).toEqual({ seeded: true, count: 40 });

    const plans = await db.performancePlans.toArray();
    expect(plans).toHaveLength(40);

    // Typos preserved verbatim per DR-01 — must not be "corrected".
    const rk1 = plans.find((p) => p.sortOrder === 1);
    expect(rk1?.name).toContain('Terlaksananyanya');
    const rk16 = plans.find((p) => p.sortOrder === 16);
    expect(rk16?.name).toContain('Telaksananya');
    const rk8 = plans.find((p) => p.sortOrder === 8);
    expect(rk8?.name).toContain('Prioduksi');
  });

  it('does not duplicate on a second call', async () => {
    await seedPerformancePlansIfEmpty();
    const second = await seedPerformancePlansIfEmpty();
    expect(second.seeded).toBe(false);

    const count = await db.performancePlans.count();
    expect(count).toBe(40);
  });

  it('matches the source seed count', () => {
    expect(PERFORMANCE_PLANS_2026).toHaveLength(40);
  });
});

describe('refreshSeedKeywords', () => {
  it('menambahkan kata kunci bawaan baru ke RK yang sudah tersimpan', async () => {
    await seedPerformancePlansIfEmpty();

    // Tiru kondisi pemasangan lama: kata kunci RK #5 dipangkas ke daftar
    // sebelum kalibrasi Agustus 2026 (belum ada 'shped'/'harga perdesaan').
    const rk5 = (await db.performancePlans.toArray()).find((p) => p.sortOrder === 5)!;
    await db.performancePlans.put({ ...rk5, keywords: ['ihk', 'inflasi'] });

    const result = await refreshSeedKeywords();
    expect(result.plansUpdated).toBeGreaterThan(0);
    expect(result.keywordsAdded).toBeGreaterThan(0);

    const after = (await db.performancePlans.toArray()).find((p) => p.sortOrder === 5)!;
    expect(after.keywords).toContain('shped');
  });

  it('tidak menghapus kata kunci buatan pengguna sendiri', async () => {
    await seedPerformancePlansIfEmpty();
    const rk5 = (await db.performancePlans.toArray()).find((p) => p.sortOrder === 5)!;
    await db.performancePlans.put({ ...rk5, keywords: [...rk5.keywords, 'pasar seririt'] });

    await refreshSeedKeywords();

    const after = (await db.performancePlans.toArray()).find((p) => p.sortOrder === 5)!;
    expect(after.keywords).toContain('pasar seririt');
  });

  it('tidak melakukan apa pun kalau kata kunci bawaan sudah lengkap', async () => {
    await seedPerformancePlansIfEmpty();
    expect(await refreshSeedKeywords()).toEqual({ plansUpdated: 0, keywordsAdded: 0 });
  });
});
