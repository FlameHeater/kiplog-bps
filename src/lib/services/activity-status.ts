import { performancePlanRepository } from '@/db/repositories/performance-plan.repository';
import { settingsRepository } from '@/db/repositories/settings.repository';
import { skpPeriodRepository } from '@/db/repositories/skp-period.repository';
import { validateReadyToReport } from './activity-validator';
import type { Activity } from '@/types';

// §9.4: ready_to_report is only reached once §12.3 validation passes — and
// must be RE-checked whenever anything it depends on changes, not just on
// explicit form save. 'reported'/'archived' are deliberately excluded:
// those are manual markers (see unmarkActivityReported) that unrelated
// field edits shouldn't silently undo.
//
// When not ready, the result is 'draft' or 'complete' depending on WHICH
// checks are failing: if the activity's own core content (date/time/RK/
// description/achievement/progress) is intact and only the report-readiness
// extras (evidence/link/period lock) are missing, 'complete' is accurate.
// If core content itself is missing, it's 'draft'.
const CORE_CONTENT_FIELDS = new Set([
  'date',
  'startTime',
  'performancePlanId',
  'description',
  'achievement',
  'progress',
]);

// Imports the three repositories directly (not the `@/db/repositories`
// barrel) — this function is called from evidence.repository.ts, and the
// barrel re-exports evidenceRepository itself, which would create a require
// cycle.
//
// Single source of truth for this logic: it used to live only inside
// ActivityForm's onSubmit/autosave, so anything that changed an activity's
// evidenceCount/evidenceLinkStatus OUTSIDE that form (adding/removing an
// evidence file, which writes straight to Dexie from evidence.repository.ts)
// left status stale until the user separately opened the form and clicked
// Simpan — that's the bug this function fixes by being callable from both
// places instead of duplicated.
export async function recomputeActivityStatus(activity: Activity): Promise<Activity> {
  if (activity.status !== 'draft' && activity.status !== 'complete' && activity.status !== 'ready_to_report') {
    return activity;
  }

  const [settings, plan, period] = await Promise.all([
    settingsRepository.get(),
    activity.performancePlanId ? performancePlanRepository.get(activity.performancePlanId) : Promise.resolve(undefined),
    skpPeriodRepository.get(activity.skpPeriod),
  ]);

  const validation = validateReadyToReport(
    {
      date: activity.date,
      startTime: activity.startTime,
      endTime: activity.endTime,
      performancePlanId: activity.performancePlanId,
      planExists: activity.performancePlanId ? Boolean(plan) : false,
      description: activity.description,
      achievement: activity.achievement,
      progress: activity.progress,
      evidenceCount: activity.evidenceCount,
      evidenceLink: activity.evidenceLink,
    },
    {
      requireEvidenceForReady: settings?.requireEvidenceForReady ?? true,
      requireEvidenceLinkForReady: settings?.requireEvidenceLinkForReady ?? true,
      periodLocked: period?.isLocked ?? false,
    }
  );

  const nextStatus = validation.isReady
    ? 'ready_to_report'
    : validation.checks.filter((c) => CORE_CONTENT_FIELDS.has(c.field)).every((c) => c.passed)
      ? 'complete'
      : 'draft';

  return activity.status === nextStatus ? activity : { ...activity, status: nextStatus };
}
