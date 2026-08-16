import type { Activity, ActivityEditFormValues } from '@/types';

/** year/skpPeriod are derived from `date` (§9.2) — always Jan 1..Dec 31 of that date's year. */
export function deriveYearAndSkpPeriod(date: string): { year: number; skpPeriod: string } {
  const [yearStr, monthStr] = date.split('-');
  return { year: Number(yearStr), skpPeriod: `${yearStr}-${monthStr}` };
}

export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number) as [number, number];
  const [endH, endM] = endTime.split(':').map(Number) as [number, number];
  return endH * 60 + endM - (startH * 60 + startM);
}

/**
 * Merges form input into a full Activity record. `existing` carries over
 * KipLog-only fields the form doesn't touch (evidence state, templateId,
 * sentForReview, etc.) so editing never clobbers them.
 */
export function buildActivityFromForm(
  values: ActivityEditFormValues,
  existing?: Activity
): Activity {
  const now = new Date().toISOString();
  const { year, skpPeriod } = deriveYearAndSkpPeriod(values.date);

  return {
    id: existing?.id ?? crypto.randomUUID(),
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    description: values.description,
    progress: values.progress,
    achievement: values.achievement,
    evidenceLink: values.evidenceLink,
    countsTowardSkp: values.countsTowardSkp,

    year,
    skpPeriod,
    performancePlanId: values.performancePlanId,

    durationMinutes: calculateDurationMinutes(values.startTime, values.endTime),
    status: existing?.status ?? 'draft',
    evidenceLinkStatus: existing?.evidenceLinkStatus ?? 'none',
    location: values.location,
    project: existing?.project,
    notes: existing?.notes,
    tags: values.tags,
    rbAreas: values.rbAreas,
    evidenceCount: existing?.evidenceCount ?? 0,
    reportedAt: existing?.reportedAt ?? null,
    sentForReview: existing?.sentForReview ?? false,
    templateId: existing?.templateId ?? null,

    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
