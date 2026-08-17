import { PERFORMANCE_PLANS_2026, type PerformancePlanSeed } from '@/data/performance-plans-2026';
import { performancePlanRepository } from '@/db/repositories';
import type { PerformancePlan } from '@/types';

const SEED_YEAR = 2026;

/**
 * Pure transform, verbatim wording preserved (DR-01) — exported so tests
 * (e.g. the §12.1.5 RK-matcher fixtures) can build real PerformancePlan
 * objects from the seed without touching Dexie.
 */
export function toPerformancePlans(
  seeds: PerformancePlanSeed[] = PERFORMANCE_PLANS_2026
): PerformancePlan[] {
  const now = new Date().toISOString();
  return seeds.map((seed) => ({
    id: crypto.randomUUID(),
    year: SEED_YEAR,
    type: seed.type,
    name: seed.name,
    parentPlanName: seed.parentPlanName,
    teamName: seed.teamName,
    teamLeader: seed.teamLeader,
    category: seed.category,
    keywords: seed.keywords,
    tags: seed.tags,
    color: seed.color,
    isActive: true,
    isFavorite: false,
    sortOrder: seed.no,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * Menambahkan kata kunci bawaan terbaru ke RK yang SUDAH tersimpan.
 *
 * Diperlukan karena `seedPerformancePlansIfEmpty` hanya berjalan saat tabel
 * masih kosong: pengguna yang sudah memakai aplikasi sejak sebelum kosakata
 * pencocokan diperluas (kalibrasi Agustus 2026 dari file cascading + log
 * kegiatan nyata) tidak akan pernah menerima kata kunci baru itu tanpa
 * tindakan ini.
 *
 * Sengaja MENGGABUNG, bukan menimpa: kata kunci yang pengguna tambahkan
 * sendiri lewat KeywordEditor dan yang dipelajari otomatis (§12.1.4) tetap
 * utuh. Konsekuensi yang disadari — kata kunci bawaan yang pernah dihapus
 * pengguna akan muncul kembali; itu dipilih karena kehilangan kata kunci
 * buatan pengguna jauh lebih merugikan daripada munculnya kembali satu kata
 * bawaan yang bisa dihapus lagi dalam satu klik.
 *
 * Pencocokan memakai `sortOrder` + `year`, bukan `id`, karena id di database
 * dibuat acak saat seeding di perangkat masing-masing.
 */
export async function refreshSeedKeywords(
  seeds: PerformancePlanSeed[] = PERFORMANCE_PLANS_2026
): Promise<{ plansUpdated: number; keywordsAdded: number }> {
  const stored = await performancePlanRepository.list();
  const seedByNo = new Map(seeds.map((s) => [s.no, s]));

  let plansUpdated = 0;
  let keywordsAdded = 0;

  for (const plan of stored) {
    if (plan.year !== SEED_YEAR) continue;
    const seed = seedByNo.get(plan.sortOrder);
    if (!seed) continue;

    const existing = new Set(plan.keywords.map((k) => k.toLowerCase()));
    const missing = seed.keywords.filter((k) => !existing.has(k.toLowerCase()));
    if (missing.length === 0) continue;

    await performancePlanRepository.upsert({
      ...plan,
      keywords: [...plan.keywords, ...missing],
      updatedAt: new Date().toISOString(),
    });
    plansUpdated++;
    keywordsAdded += missing.length;
  }

  return { plansUpdated, keywordsAdded };
}

/**
 * Transforms the verbatim RK seed (PRD §5.2, DR-01) into PerformancePlan
 * entities and inserts them if the table is empty.
 */
export async function seedPerformancePlansIfEmpty(): Promise<{ seeded: boolean; count: number }> {
  const existing = await performancePlanRepository.count();
  if (existing > 0) {
    return { seeded: false, count: existing };
  }

  const plans = toPerformancePlans();
  await performancePlanRepository.bulkAdd(plans);
  return { seeded: true, count: plans.length };
}
