import { afterEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { activityRepository, evidenceRepository } from '@/db/repositories';
import type { Activity, Evidence, PerformancePlan } from '@/types';

afterEach(async () => {
  await db.activities.clear();
  await db.evidence.clear();
  await db.performancePlans.clear();
});

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: crypto.randomUUID(),
    date: '2026-08-16',
    startTime: '08:00',
    endTime: '09:00',
    description: 'x',
    progress: 50,
    achievement: '',
    evidenceLink: null,
    countsTowardSkp: true,
    year: 2026,
    skpPeriod: '2026-08',
    performancePlanId: null,
    durationMinutes: 60,
    status: 'draft',
    evidenceLinkStatus: 'none',
    tags: [],
    rbAreas: [],
    evidenceCount: 0,
    reportedAt: null,
    sentForReview: false,
    templateId: null,
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
    ...overrides,
  };
}

function makePlan(overrides: Partial<PerformancePlan> = {}): PerformancePlan {
  return {
    id: crypto.randomUUID(),
    year: 2026,
    type: 'Utama',
    name: 'Rencana Kinerja Uji',
    category: null,
    keywords: [],
    tags: [],
    color: '#2563eb',
    isActive: true,
    isFavorite: false,
    sortOrder: 0,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
    ...overrides,
  };
}

function makeEvidence(activityId: string | null, overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: crypto.randomUUID(),
    activityId,
    kind: 'file',
    caption: '',
    category: 'lainnya',
    sortOrder: 0,
    inboxStatus: activityId ? 'assigned' : 'unassigned',
    capturedAt: null,
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
    ...overrides,
  };
}

describe('evidenceRepository.addForActivity (§9.6 sync)', () => {
  it('increments evidenceCount and flips evidenceLinkStatus none -> collected', async () => {
    const activity = makeActivity();
    await db.activities.add(activity);

    await evidenceRepository.addForActivity(makeEvidence(activity.id));

    const updated = await db.activities.get(activity.id);
    expect(updated?.evidenceCount).toBe(1);
    expect(updated?.evidenceLinkStatus).toBe('collected');
  });

  it('decrements on remove and reverts to none at zero', async () => {
    const activity = makeActivity();
    await db.activities.add(activity);
    const evidence = makeEvidence(activity.id);
    await evidenceRepository.addForActivity(evidence);

    await evidenceRepository.remove(evidence.id);

    const updated = await db.activities.get(activity.id);
    expect(updated?.evidenceCount).toBe(0);
    expect(updated?.evidenceLinkStatus).toBe('none');
  });

  it('never lets evidenceCount go negative', async () => {
    const activity = makeActivity({ evidenceCount: 0 });
    await db.activities.add(activity);
    const evidence = makeEvidence(activity.id);
    await db.evidence.add(evidence); // bypass sync to simulate a pre-existing inconsistency

    await evidenceRepository.remove(evidence.id);

    const updated = await db.activities.get(activity.id);
    expect(updated?.evidenceCount).toBe(0);
  });
});

describe('evidence changes recompute activity status (bug fix: no longer requires opening the form)', () => {
  it('flips complete -> ready_to_report when the last required evidence is added', async () => {
    const plan = makePlan();
    await db.performancePlans.add(plan);
    const activity = makeActivity({
      status: 'complete',
      performancePlanId: plan.id,
      description: 'Deskripsi kegiatan yang cukup panjang',
      achievement: 'Capaian hasil kegiatan yang cukup panjang',
      progress: 100,
      evidenceLink: 'https://drive.google.com/bukti',
      evidenceCount: 0,
    });
    await db.activities.add(activity);

    await evidenceRepository.addForActivity(makeEvidence(activity.id));

    const updated = await db.activities.get(activity.id);
    expect(updated?.evidenceCount).toBe(1);
    expect(updated?.status).toBe('ready_to_report');
  });

  it('flips ready_to_report -> complete when the only evidence is removed', async () => {
    const plan = makePlan();
    await db.performancePlans.add(plan);
    const activity = makeActivity({
      status: 'draft',
      performancePlanId: plan.id,
      description: 'Deskripsi kegiatan yang cukup panjang',
      achievement: 'Capaian hasil kegiatan yang cukup panjang',
      progress: 100,
      evidenceLink: 'https://drive.google.com/bukti',
      evidenceCount: 0,
    });
    await db.activities.add(activity);
    const evidence = makeEvidence(activity.id);
    await evidenceRepository.addForActivity(evidence);
    expect((await db.activities.get(activity.id))?.status).toBe('ready_to_report');

    await evidenceRepository.remove(evidence.id);

    const updated = await db.activities.get(activity.id);
    expect(updated?.evidenceCount).toBe(0);
    expect(updated?.status).toBe('complete');
  });
});

describe('activityRepository.removeWithEvidence (§17.2 orphan handling)', () => {
  it('unassign mode returns evidence to the Inbox instead of deleting it', async () => {
    const activity = makeActivity();
    await db.activities.add(activity);
    const evidence = makeEvidence(activity.id);
    await evidenceRepository.addForActivity(evidence);

    await activityRepository.removeWithEvidence(activity.id, 'unassign');

    const orphan = await db.evidence.get(evidence.id);
    expect(orphan?.activityId).toBeNull();
    expect(orphan?.inboxStatus).toBe('unassigned');
    expect(await db.activities.get(activity.id)).toBeUndefined();
  });

  it('delete mode removes the evidence along with the activity', async () => {
    const activity = makeActivity();
    await db.activities.add(activity);
    const evidence = makeEvidence(activity.id);
    await evidenceRepository.addForActivity(evidence);

    await activityRepository.removeWithEvidence(activity.id, 'delete');

    expect(await db.evidence.get(evidence.id)).toBeUndefined();
  });
});
