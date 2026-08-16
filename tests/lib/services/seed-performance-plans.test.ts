import { afterEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { seedPerformancePlansIfEmpty } from '@/lib/services/seed-performance-plans';
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
