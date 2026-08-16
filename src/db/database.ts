import Dexie, { type EntityTable } from 'dexie';
import type {
  Activity,
  ActivityTemplate,
  AppSettings,
  Evidence,
  PerformancePlan,
  PlanPeriodStatus,
  SkpPeriod,
  UserProfile,
} from '@/types';

// PRD §9.5. Do NOT change version(1)'s schema shape after users have data —
// bump the version number and add an idempotent .upgrade() instead.
export class KipLogDatabase extends Dexie {
  userProfile!: EntityTable<UserProfile, 'id'>;
  performancePlans!: EntityTable<PerformancePlan, 'id'>;
  activities!: EntityTable<Activity, 'id'>;
  evidence!: EntityTable<Evidence, 'id'>;
  templates!: EntityTable<ActivityTemplate, 'id'>;
  skpPeriods!: EntityTable<SkpPeriod, 'id'>;
  planPeriodStatus!: EntityTable<PlanPeriodStatus, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;

  constructor() {
    super('kiplog-bps');

    this.version(1).stores({
      userProfile: 'id',
      performancePlans: 'id, year, type, isActive, isFavorite, category, usageCount, sortOrder',
      activities:
        'id, date, skpPeriod, year, performancePlanId, status, evidenceLinkStatus, *tags, [date+status], [skpPeriod+performancePlanId]',
      evidence: 'id, activityId, inboxStatus, kind, category, createdAt',
      templates: 'id, name, performancePlanId, usageCount',
      skpPeriods: 'id, year, month, isLocked',
      planPeriodStatus: 'id, performancePlanId, skpPeriod',
      settings: 'id',
    });
  }
}

export const db = new KipLogDatabase();

// Fires on every local write across all tables — the Drive sync engine
// (src/lib/sync/sync-engine.ts) registers itself here via
// `setOnLocalWrite` at app bootstrap instead of this file importing the
// sync engine directly, which would create a require cycle (sync-engine
// imports backup.ts imports the repositories imports this file).
let onLocalWrite: (() => void) | null = null;

export function setOnLocalWrite(handler: () => void): void {
  onLocalWrite = handler;
}

const WRITABLE_TABLES = [
  db.userProfile,
  db.performancePlans,
  db.activities,
  db.evidence,
  db.templates,
  db.skpPeriods,
  db.planPeriodStatus,
  db.settings,
] as const;

for (const table of WRITABLE_TABLES) {
  table.hook('creating', () => onLocalWrite?.());
  table.hook('updating', () => onLocalWrite?.());
  table.hook('deleting', () => onLocalWrite?.());
}
