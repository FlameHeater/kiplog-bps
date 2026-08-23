import { activityRepository, skpPeriodRepository } from '@/db/repositories';
import type { SkpPeriod } from '@/types';

// FR-KAR-08: manual-only marker (CON-07) — KipLog never talks to real KipApp.
export async function markActivityReported(activityId: string): Promise<void> {
  await activityRepository.update(activityId, {
    status: 'reported',
    reportedAt: new Date().toISOString(),
  });
}

// §9.4 allows moving backward — used to undo an accidental "Tandai sudah diinput".
export async function unmarkActivityReported(activityId: string): Promise<void> {
  await activityRepository.update(activityId, {
    status: 'ready_to_report',
    reportedAt: null,
  });
}

// FR-KAR-11.
export async function setPlanCompleted(
  performancePlanId: string,
  skpPeriod: string,
  isCompleted: boolean
): Promise<void> {
  await skpPeriodRepository.upsertPlanStatus({
    id: `${performancePlanId}:${skpPeriod}`,
    performancePlanId,
    skpPeriod,
    isCompleted,
    completedAt: isCompleted ? new Date().toISOString() : null,
  });
}

// FR-KAR-12 — mirrors KipApp's "Kirim SKP untuk dinilai" checkbox locking the whole month.
export async function setPeriodLocked(
  skpPeriod: string,
  existing: SkpPeriod | null,
  isLocked: boolean
): Promise<void> {
  const [year, month] = skpPeriod.split('-').map(Number) as [number, number];
  const now = new Date().toISOString();
  await skpPeriodRepository.upsert({
    id: skpPeriod,
    year,
    month,
    kipAppStatus: existing?.kipAppStatus ?? 'sedang_dibuat',
    isLocked,
    lockedAt: isLocked ? now : null,
    notes: existing?.notes,
    defaultEvidenceLink: existing?.defaultEvidenceLink ?? null,
    updatedAt: now,
  });
}
