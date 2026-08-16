export interface DashboardAlert {
  id: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  urgency: number; // higher sorts first; month-end countdown always wins.
}

export interface AlertInputs {
  currentHour: number;
  hasActivityToday: boolean;
  countsInPeriod: {
    withoutEvidence: number;
    withoutEvidenceLink: number;
    inProgress: number; // status === 'draft'
  };
  unassignedEvidenceCount: number;
  lastBackupAt: string | null;
  daysSinceBackup: number | null;
  daysUntilMonthEnd: number;
  monthEndReminderDays: number;
  monthEndIncompleteCount: number;
}

// FR-ALR-01…06 — pure function, no React/Dexie; the panel is a passive list,
// never a modal or repeated toast.
export function computeAlerts(input: AlertInputs): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (input.daysUntilMonthEnd <= input.monthEndReminderDays && input.daysUntilMonthEnd >= 0) {
    alerts.push({
      id: 'month-end',
      message: `${input.daysUntilMonthEnd} hari lagi menuju batas pengisian catatan kinerja bulan ini${
        input.monthEndIncompleteCount > 0 ? ` — ${input.monthEndIncompleteCount} kegiatan belum lengkap` : ''
      }.`,
      actionLabel: 'Lihat Review',
      actionHref: '#/review',
      urgency: 100,
    });
  }

  if (input.currentHour >= 12 && !input.hasActivityToday) {
    alerts.push({
      id: 'no-activity-today',
      message: 'Anda belum mencatat kegiatan hari ini.',
      actionLabel: '+ Tambah Kegiatan',
      actionHref: '#/kegiatan',
      urgency: 90,
    });
  }

  if (input.countsInPeriod.withoutEvidenceLink > 0) {
    alerts.push({
      id: 'no-evidence-link',
      message: `${input.countsInPeriod.withoutEvidenceLink} kegiatan belum memiliki Link Bukti Dukung.`,
      actionLabel: 'Lihat',
      actionHref: '#/bukti-tautan',
      urgency: 70,
    });
  }

  if (input.countsInPeriod.withoutEvidence > 0) {
    alerts.push({
      id: 'no-evidence',
      message: `${input.countsInPeriod.withoutEvidence} kegiatan belum memiliki bukti dukung.`,
      actionLabel: 'Lihat',
      actionHref: '#/kegiatan?hasEvidence=false',
      urgency: 60,
    });
  }

  if (input.countsInPeriod.inProgress > 0) {
    alerts.push({
      id: 'in-progress',
      message: `${input.countsInPeriod.inProgress} kegiatan masih dalam proses.`,
      actionLabel: 'Lihat',
      actionHref: '#/kegiatan?status=draft',
      urgency: 50,
    });
  }

  if (input.unassignedEvidenceCount > 0) {
    alerts.push({
      id: 'unlinked-evidence',
      message: `${input.unassignedEvidenceCount} bukti dukung belum ditautkan.`,
      actionLabel: 'Buka Evidence Inbox',
      actionHref: '#/evidence-inbox',
      urgency: 40,
    });
  }

  if (input.lastBackupAt === null) {
    alerts.push({
      id: 'never-backed-up',
      message: 'Anda belum pernah membuat backup data.',
      actionLabel: 'Backup Sekarang',
      actionHref: '#/backup',
      urgency: 30,
    });
  } else if (input.daysSinceBackup !== null && input.daysSinceBackup >= 14) {
    alerts.push({
      id: 'stale-backup',
      message: `Backup terakhir ${input.daysSinceBackup} hari lalu.`,
      actionLabel: 'Backup Sekarang',
      actionHref: '#/backup',
      urgency: 20,
    });
  }

  return alerts.sort((a, b) => b.urgency - a.urgency).slice(0, 3);
}

const DISMISS_KEY_PREFIX = 'kiplog-alerts-dismissed-';

export function getDismissedAlertIds(today: string): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY_PREFIX + today);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function dismissAlert(today: string, alertId: string): void {
  const current = getDismissedAlertIds(today);
  current.add(alertId);
  try {
    localStorage.setItem(DISMISS_KEY_PREFIX + today, JSON.stringify([...current]));
  } catch {
    // localStorage unavailable (private browsing, quota) — dismissal just won't persist.
  }
}
