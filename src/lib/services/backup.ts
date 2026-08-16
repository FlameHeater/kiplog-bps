import {
  activityRepository,
  evidenceRepository,
  performancePlanRepository,
  settingsRepository,
  skpPeriodRepository,
  templateRepository,
  userProfileRepository,
} from '@/db/repositories';
import { SCHEMA_VERSION } from '@/lib/version';
import { todayString } from '@/lib/date/date-utils';
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

// Evidence Blob fields can't round-trip through JSON — the lightweight
// backup keeps every other field (fileName/category/caption/etc.) so a
// restored evidence record is still a real placeholder, just without the
// file bytes. Use the ZIP backup (exportBackupZip) for full fidelity.
export type SerializableEvidence = Omit<Evidence, 'blob' | 'thumbnailBlob'>;

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  userProfile: UserProfile | null;
  settings: AppSettings | null;
  performancePlans: PerformancePlan[];
  activities: Activity[];
  evidence: SerializableEvidence[];
  templates: ActivityTemplate[];
  skpPeriods: SkpPeriod[];
  planPeriodStatus: PlanPeriodStatus[];
}

export type ImportMode = 'replace' | 'merge';

export interface ImportImpact {
  mode: ImportMode;
  counts: Record<
    'performancePlans' | 'activities' | 'evidence' | 'templates' | 'skpPeriods' | 'planPeriodStatus',
    { inBackup: number; toAdd: number; toSkip: number }
  >;
  willReplaceProfile: boolean;
  willReplaceSettings: boolean;
}

async function collectPayload(): Promise<BackupPayload> {
  const [userProfile, settings, performancePlans, activities, evidence, templates, skpPeriods, planPeriodStatus] =
    await Promise.all([
      userProfileRepository.get(),
      settingsRepository.get(),
      performancePlanRepository.list(),
      activityRepository.list(),
      evidenceRepository.list(),
      templateRepository.list(),
      skpPeriodRepository.list(),
      skpPeriodRepository.listPlanStatus(),
    ]);

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    userProfile: userProfile ?? null,
    settings: settings ?? null,
    performancePlans,
    activities,
    evidence: evidence.map(({ blob: _blob, thumbnailBlob: _thumbnailBlob, ...rest }) => rest),
    templates,
    skpPeriods,
    planPeriodStatus,
  };
}

async function markBackedUpNow(): Promise<void> {
  const settings = await settingsRepository.get();
  if (!settings) return;
  await settingsRepository.save({ ...settings, lastBackupAt: new Date().toISOString() });
}

// FR-DAT-07.
export async function exportBackupJson(): Promise<{ blob: Blob; filename: string }> {
  const payload = await collectPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  await markBackedUpNow();
  return { blob, filename: `kiplog-backup-${todayString()}.json` };
}

function extensionFromMimeType(mimeType: string | undefined): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  };
  return (mimeType && map[mimeType]) || 'bin';
}

// FR-DAT-08 — data.json (same shape as the lightweight backup) + evidence/ with real files.
export async function exportBackupZip(): Promise<{ blob: Blob; filename: string }> {
  const JSZip = (await import('jszip')).default;
  const payload = await collectPayload();
  const allEvidence = await evidenceRepository.list();

  const zip = new JSZip();
  zip.file('data.json', JSON.stringify(payload, null, 2));
  const evidenceFolder = zip.folder('evidence');
  if (evidenceFolder) {
    for (const item of allEvidence) {
      if (item.blob) evidenceFolder.file(`${item.id}.${extensionFromMimeType(item.mimeType)}`, item.blob);
      if (item.thumbnailBlob) evidenceFolder.file(`${item.id}_thumb.webp`, item.thumbnailBlob);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  await markBackedUpNow();
  return { blob, filename: `kiplog-backup-${todayString()}.zip` };
}

// FR-DAT-10: newer-than-current is rejected; older is migrated in place.
// No migrations exist yet since schema v1 is the only version shipped.
function migratePayload(payload: BackupPayload): BackupPayload {
  if (payload.schemaVersion > SCHEMA_VERSION) {
    throw new Error('Berkas cadangan ini dibuat oleh KipLog versi lebih baru. Perbarui aplikasi terlebih dahulu.');
  }
  return payload;
}

export interface ParsedBackup {
  payload: BackupPayload;
  evidenceBlobs: Map<string, { blob?: Blob; thumbnailBlob?: Blob }>;
}

export async function parseBackupFile(file: File): Promise<ParsedBackup> {
  if (file.name.endsWith('.zip')) {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);
    const dataFile = zip.file('data.json');
    if (!dataFile) throw new Error('Berkas ZIP ini tidak berisi data.json yang valid.');
    const payload = migratePayload(JSON.parse(await dataFile.async('string')) as BackupPayload);

    const evidenceBlobs = new Map<string, { blob?: Blob; thumbnailBlob?: Blob }>();
    for (const item of payload.evidence) {
      const [fileEntry] = zip.file(new RegExp(`evidence/${item.id}\\.[^/]+$`));
      const [thumbEntry] = zip.file(new RegExp(`evidence/${item.id}_thumb\\.[^/]+$`));
      const blob = fileEntry ? await fileEntry.async('blob') : undefined;
      const thumbnailBlob = thumbEntry ? await thumbEntry.async('blob') : undefined;
      if (blob || thumbnailBlob) evidenceBlobs.set(item.id, { blob, thumbnailBlob });
    }
    return { payload, evidenceBlobs };
  }

  const text = await file.text();
  const payload = migratePayload(JSON.parse(text) as BackupPayload);
  return { payload, evidenceBlobs: new Map() };
}

async function countExisting<T extends { id: string }>(existing: T[], incoming: { id: string }[]) {
  const existingIds = new Set(existing.map((e) => e.id));
  const toAdd = incoming.filter((i) => !existingIds.has(i.id)).length;
  return { inBackup: incoming.length, toAdd, toSkip: incoming.length - toAdd };
}

export async function computeImportImpact(payload: BackupPayload, mode: ImportMode): Promise<ImportImpact> {
  if (mode === 'replace') {
    return {
      mode,
      counts: {
        performancePlans: { inBackup: payload.performancePlans.length, toAdd: payload.performancePlans.length, toSkip: 0 },
        activities: { inBackup: payload.activities.length, toAdd: payload.activities.length, toSkip: 0 },
        evidence: { inBackup: payload.evidence.length, toAdd: payload.evidence.length, toSkip: 0 },
        templates: { inBackup: payload.templates.length, toAdd: payload.templates.length, toSkip: 0 },
        skpPeriods: { inBackup: payload.skpPeriods.length, toAdd: payload.skpPeriods.length, toSkip: 0 },
        planPeriodStatus: { inBackup: payload.planPeriodStatus.length, toAdd: payload.planPeriodStatus.length, toSkip: 0 },
      },
      willReplaceProfile: payload.userProfile !== null,
      willReplaceSettings: payload.settings !== null,
    };
  }

  const [plans, activities, evidence, templates, skpPeriods, planPeriodStatus] = await Promise.all([
    performancePlanRepository.list(),
    activityRepository.list(),
    evidenceRepository.list(),
    templateRepository.list(),
    skpPeriodRepository.list(),
    skpPeriodRepository.listPlanStatus(),
  ]);

  return {
    mode,
    counts: {
      performancePlans: await countExisting(plans, payload.performancePlans),
      activities: await countExisting(activities, payload.activities),
      evidence: await countExisting(evidence, payload.evidence),
      templates: await countExisting(templates, payload.templates),
      skpPeriods: await countExisting(skpPeriods, payload.skpPeriods),
      planPeriodStatus: await countExisting(planPeriodStatus, payload.planPeriodStatus),
    },
    willReplaceProfile: false,
    willReplaceSettings: false,
  };
}

function mergeEvidence(payload: SerializableEvidence[], blobs: Map<string, { blob?: Blob; thumbnailBlob?: Blob }>): Evidence[] {
  return payload.map((item) => ({ ...item, ...blobs.get(item.id) }));
}

// FR-DAT-09.
export async function executeImport(
  { payload, evidenceBlobs }: ParsedBackup,
  mode: ImportMode
): Promise<void> {
  const evidenceWithBlobs = mergeEvidence(payload.evidence, evidenceBlobs);

  if (mode === 'replace') {
    await Promise.all([
      performancePlanRepository.clear(),
      activityRepository.clear(),
      evidenceRepository.clear(),
      templateRepository.clear(),
      skpPeriodRepository.clear(),
    ]);
    if (payload.userProfile) await userProfileRepository.save(payload.userProfile);
    if (payload.settings) await settingsRepository.save(payload.settings);
    await Promise.all([
      performancePlanRepository.bulkPut(payload.performancePlans),
      activityRepository.bulkPut(payload.activities),
      evidenceRepository.bulkPut(evidenceWithBlobs),
      templateRepository.bulkPut(payload.templates),
      skpPeriodRepository.bulkPut(payload.skpPeriods),
      skpPeriodRepository.bulkPutPlanStatus(payload.planPeriodStatus),
    ]);
    return;
  }

  const [plans, activities, evidence, templates, skpPeriods, planPeriodStatus] = await Promise.all([
    performancePlanRepository.list(),
    activityRepository.list(),
    evidenceRepository.list(),
    templateRepository.list(),
    skpPeriodRepository.list(),
    skpPeriodRepository.listPlanStatus(),
  ]);
  const skipDuplicates = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
    const existingIds = new Set(existing.map((e) => e.id));
    return incoming.filter((i) => !existingIds.has(i.id));
  };

  await Promise.all([
    performancePlanRepository.bulkPut(skipDuplicates(plans, payload.performancePlans)),
    activityRepository.bulkPut(skipDuplicates(activities, payload.activities)),
    evidenceRepository.bulkPut(skipDuplicates(evidence, evidenceWithBlobs)),
    templateRepository.bulkPut(skipDuplicates(templates, payload.templates)),
    skpPeriodRepository.bulkPut(skipDuplicates(skpPeriods, payload.skpPeriods)),
    skpPeriodRepository.bulkPutPlanStatus(skipDuplicates(planPeriodStatus, payload.planPeriodStatus)),
  ]);
}

// FR-DAT-11 — caller is responsible for the "type HAPUS to confirm" gate.
export async function deleteAllData(): Promise<void> {
  await Promise.all([
    userProfileRepository.clear(),
    settingsRepository.clear(),
    performancePlanRepository.clear(),
    activityRepository.clear(),
    evidenceRepository.clear(),
    templateRepository.clear(),
    skpPeriodRepository.clear(),
  ]);
}
