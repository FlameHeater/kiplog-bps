import { db } from '@/db/database';
import { recomputeActivityStatus } from '@/lib/services/activity-status';
import type { Evidence } from '@/types';

async function syncActivityEvidenceCount(activityId: string, delta: number): Promise<void> {
  const activity = await db.activities.get(activityId);
  if (!activity) return;
  const newCount = Math.max(0, activity.evidenceCount + delta);
  // §3.1/§9.2: evidenceLinkStatus tracks the Data Dukung pipeline, not the
  // raw file count — only bump it between 'none' and 'collected' here.
  // 'packaged'/'uploaded' (Fase 5, driven by PDF generation) are left alone.
  let evidenceLinkStatus = activity.evidenceLinkStatus;
  if (newCount > 0 && evidenceLinkStatus === 'none') evidenceLinkStatus = 'collected';
  if (newCount === 0 && evidenceLinkStatus === 'collected') evidenceLinkStatus = 'none';

  // Adding/removing evidence can push an activity in or out of Ready-to-
  // Report eligibility (evidence is one of the checks) — recompute status
  // here too, not just in ActivityForm's own save path, or a status change
  // caused purely by an evidence change stays stale until the user
  // separately opens the form and clicks Simpan.
  const withNewCount = { ...activity, evidenceCount: newCount, evidenceLinkStatus };
  const { status } = await recomputeActivityStatus(withNewCount);

  await db.activities.update(activityId, {
    evidenceCount: newCount,
    evidenceLinkStatus,
    status,
    updatedAt: new Date().toISOString(),
  });
}

export const evidenceRepository = {
  async listInbox(): Promise<Evidence[]> {
    return db.evidence.where('inboxStatus').equals('unassigned').toArray();
  },
  async listByActivity(activityId: string): Promise<Evidence[]> {
    return db.evidence.where('activityId').equals(activityId).sortBy('sortOrder');
  },
  async get(id: string): Promise<Evidence | undefined> {
    return db.evidence.get(id);
  },
  async list(): Promise<Evidence[]> {
    return db.evidence.toArray();
  },
  // Evidence Inbox items (activityId null) never touch an Activity, so a
  // plain insert is enough there. Use addForActivity when activityId is set.
  async add(evidence: Evidence): Promise<void> {
    await db.evidence.add(evidence);
  },
  // §9.6: evidenceCount/evidenceLinkStatus updated in the same transaction
  // as the evidence insert that caused them to change.
  async addForActivity(evidence: Evidence): Promise<void> {
    // Widened beyond evidence+activities: syncActivityEvidenceCount calls
    // recomputeActivityStatus, which reads settings/performancePlans/
    // skpPeriods too — Dexie requires every table a transaction touches
    // (even read-only) to be declared up front, or those reads throw
    // NotFoundError once inside the callback.
    await db.transaction('rw', db.evidence, db.activities, db.settings, db.performancePlans, db.skpPeriods, async () => {
      await db.evidence.add(evidence);
      if (evidence.activityId) {
        await syncActivityEvidenceCount(evidence.activityId, 1);
      }
    });
  },
  async update(id: string, changes: Partial<Evidence>): Promise<void> {
    await db.evidence.update(id, { ...changes, updatedAt: new Date().toISOString() });
  },
  // Re-links an Inbox item to an activity (FR-INB-04), syncing the count.
  async assignToActivity(id: string, activityId: string): Promise<void> {
    // Widened table set — see the comment on addForActivity above.
    await db.transaction('rw', db.evidence, db.activities, db.settings, db.performancePlans, db.skpPeriods, async () => {
      await db.evidence.update(id, {
        activityId,
        inboxStatus: 'assigned',
        updatedAt: new Date().toISOString(),
      });
      await syncActivityEvidenceCount(activityId, 1);
    });
  },
  async remove(id: string): Promise<void> {
    // Widened table set — see the comment on addForActivity above.
    await db.transaction('rw', db.evidence, db.activities, db.settings, db.performancePlans, db.skpPeriods, async () => {
      const evidence = await db.evidence.get(id);
      await db.evidence.delete(id);
      if (evidence?.activityId) {
        await syncActivityEvidenceCount(evidence.activityId, -1);
      }
    });
  },
  async reorder(activityId: string, orderedIds: string[]): Promise<void> {
    await db.transaction('rw', db.evidence, async () => {
      await Promise.all(
        orderedIds.map((id, index) => db.evidence.update(id, { sortOrder: index }))
      );
    });
    void activityId; // kept for call-site clarity; reorder itself is activity-scoped by orderedIds
  },
  // §17.2 "Evidence yatim": when an Activity is deleted with the "kembalikan
  // ke Inbox" choice, its evidence becomes unassigned instead of vanishing.
  async unassignAllForActivity(activityId: string): Promise<void> {
    const items = await db.evidence.where('activityId').equals(activityId).toArray();
    await db.evidence.bulkPut(
      items.map((e) => ({
        ...e,
        activityId: null,
        inboxStatus: 'unassigned' as const,
        updatedAt: new Date().toISOString(),
      }))
    );
  },
  async deleteAllForActivity(activityId: string): Promise<void> {
    const items = await db.evidence.where('activityId').equals(activityId).toArray();
    await db.evidence.bulkDelete(items.map((e) => e.id));
  },
  // Backup restore only — bypasses the count-sync helper above (the backup
  // already contains each Activity's correct evidenceCount).
  async bulkPut(evidence: Evidence[]): Promise<void> {
    await db.evidence.bulkPut(evidence);
  },
  async clear(): Promise<void> {
    await db.evidence.clear();
  },
};
