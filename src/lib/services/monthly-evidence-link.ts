import { activityRepository, skpPeriodRepository } from '@/db/repositories';
import type { SkpPeriod } from '@/types';

// FR — one "standard" evidence link per SKP period (year+month), stored on
// the existing SkpPeriod row (already keyed by "YYYY-MM") rather than a new
// table. Two consumers: this function fills in every EXISTING activity in
// that period that doesn't have a link yet, and ActivityForm.tsx reads
// `skpPeriod.defaultEvidenceLink` to prefill NEW activities as they're
// created — together this is the "otomatisasi" the user asked for, without
// ever overwriting a link someone already set by hand.

export interface ApplyMonthlyLinkResult {
  period: SkpPeriod;
  filledCount: number;
}

/**
 * Saves the period's default link and retroactively fills every activity in
 * that period whose evidenceLink is still empty. Never touches activities
 * that already have a link — this is additive, not a bulk overwrite.
 */
export async function setMonthlyEvidenceLink(
  skpPeriod: string,
  link: string | null
): Promise<ApplyMonthlyLinkResult> {
  const [year, month] = skpPeriod.split('-').map(Number) as [number, number];
  const existing = await skpPeriodRepository.get(skpPeriod);
  const now = new Date().toISOString();

  const period: SkpPeriod = {
    id: skpPeriod,
    year,
    month,
    kipAppStatus: existing?.kipAppStatus ?? 'sedang_dibuat',
    isLocked: existing?.isLocked ?? false,
    lockedAt: existing?.lockedAt ?? null,
    notes: existing?.notes,
    defaultEvidenceLink: link,
    updatedAt: now,
  };
  await skpPeriodRepository.upsert(period);

  let filledCount = 0;
  if (link) {
    const activitiesInPeriod = await activityRepository.listBySkpPeriod(skpPeriod);
    const toFill = activitiesInPeriod.filter((a) => !a.evidenceLink);
    await Promise.all(
      toFill.map((a) => activityRepository.update(a.id, { evidenceLink: link, evidenceLinkStatus: 'uploaded' }))
    );
    filledCount = toFill.length;
  }

  return { period, filledCount };
}

/** Every SkpPeriod that has a default link set, most recent first — the "rekap" list. */
export async function listMonthlyEvidenceLinks(): Promise<SkpPeriod[]> {
  const all = await skpPeriodRepository.list();
  return all.filter((p) => p.defaultEvidenceLink).sort((a, b) => b.id.localeCompare(a.id));
}
