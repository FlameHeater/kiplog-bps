import { useMemo, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useSettings } from '@/hooks/useSettings';
import { useUnassignedEvidenceCount } from '@/hooks/useAllEvidence';
import { todayString } from '@/lib/date/date-utils';
import { computeAlerts, dismissAlert, getDismissedAlertIds } from '@/lib/services/alerts';

// FR-ALR-01…06 — passive panel only; never a modal or repeated toast.
export function AlertPanel() {
  const activities = useActivities();
  const settings = useSettings();
  const unassignedEvidenceCount = useUnassignedEvidenceCount();
  const [, forceRerender] = useState(0);

  const today = todayString();

  const allAlerts = useMemo(() => {
    if (!activities || !settings) return [];
    const period = today.slice(0, 7);
    const periodActivities = activities.filter((a) => a.skpPeriod === period && a.status !== 'archived');
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysUntilMonthEnd = daysInMonth - now.getDate();
    const daysSinceBackup = settings.lastBackupAt
      ? Math.floor((now.getTime() - new Date(settings.lastBackupAt).getTime()) / 86400000)
      : null;

    return computeAlerts({
      currentHour: now.getHours(),
      hasActivityToday: activities.some((a) => a.date === today && a.status !== 'archived'),
      countsInPeriod: {
        withoutEvidence: periodActivities.filter((a) => a.evidenceCount === 0).length,
        withoutEvidenceLink: periodActivities.filter((a) => !a.evidenceLink).length,
        inProgress: periodActivities.filter((a) => a.status === 'draft').length,
      },
      unassignedEvidenceCount: unassignedEvidenceCount ?? 0,
      lastBackupAt: settings.lastBackupAt,
      daysSinceBackup,
      daysUntilMonthEnd,
      monthEndReminderDays: settings.monthEndReminderDays,
      monthEndIncompleteCount: periodActivities.filter((a) => a.status === 'draft' || a.status === 'complete').length,
    });
  }, [activities, settings, unassignedEvidenceCount, today]);

  // Not memoized: re-reads localStorage each render, cheap, and the only way
  // to reflect a dismiss click without lifting the dismissed-set into state.
  const dismissed = getDismissedAlertIds(today);
  const alerts = allAlerts.filter((a) => !dismissed.has(a.id));

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center justify-between gap-3 rounded-card border border-warning/40 bg-warning/5 p-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>{alert.message}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a href={alert.actionHref} className="text-xs font-medium text-primary hover:underline">
              {alert.actionLabel}
            </a>
            <button
              type="button"
              aria-label="Tutup peringatan"
              onClick={() => {
                dismissAlert(today, alert.id);
                forceRerender((v) => v + 1);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
