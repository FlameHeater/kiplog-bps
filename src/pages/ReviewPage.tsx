import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ActivityCard } from '@/features/activities/ActivityCard';
import { DeleteActivityDialog } from '@/features/activities/DeleteActivityDialog';
import { useActivities } from '@/hooks/useActivities';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';
import { useSettings } from '@/hooks/useSettings';
import { useActivityModalStore } from '@/features/activities/activity-modal-store';
import { activityRepository, evidenceRepository } from '@/db/repositories';
import { duplicateActivity } from '@/lib/services/duplicate-activity';
import { getWorkdaysInMonth, calculateCoverage, countFilledWorkdays } from '@/lib/date/workdays';
import { todayString } from '@/lib/date/date-utils';
import type { Activity } from '@/types';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

interface FollowUpGroup {
  key: string;
  label: string;
  activities: Activity[];
}

// FR-REV-01…04,06.
export function ReviewPage() {
  const activities = useActivities();
  const plans = usePerformancePlans();
  const settings = useSettings();
  const openEdit = useActivityModalStore((s) => s.openEdit);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const skpPeriod = `${year}-${String(month).padStart(2, '0')}`;
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [deleteEvidenceCount, setDeleteEvidenceCount] = useState(0);

  const config = useMemo(
    () => ({ workdays: settings?.workdays ?? [1, 2, 3, 4, 5], holidays: settings?.holidays ?? [] }),
    [settings]
  );

  const periodActivities = useMemo(
    () => (activities ?? []).filter((a) => a.skpPeriod === skpPeriod && a.status !== 'archived'),
    [activities, skpPeriod]
  );

  const planById = useMemo(() => new Map((plans ?? []).map((p) => [p.id, p])), [plans]);

  const metrics = useMemo(() => {
    const isCurrentMonth = skpPeriod === todayString().slice(0, 7);
    const workdaysInMonth = getWorkdaysInMonth(year, month, config);
    const workdaysCounted = isCurrentMonth ? getWorkdaysInMonth(year, month, config, todayString()) : workdaysInMonth;
    const filled = countFilledWorkdays(workdaysCounted, periodActivities.map((a) => a.date));
    const coverage = calculateCoverage(filled, workdaysCounted.length);

    const activePlans = (plans ?? []).filter((p) => p.isActive);
    const usedPlanIds = new Set(periodActivities.map((a) => a.performancePlanId).filter((id): id is string => !!id));
    const totalEvidence = periodActivities.reduce((sum, a) => sum + a.evidenceCount, 0);
    const avgProgress = periodActivities.length
      ? Math.round(periodActivities.reduce((sum, a) => sum + a.progress, 0) / periodActivities.length)
      : 0;
    const linked = periodActivities.filter((a) => a.evidenceLink).length;

    return {
      coverage,
      workdaysInMonth: workdaysInMonth.length,
      workdaysCounted: workdaysCounted.length,
      filled,
      activityCount: periodActivities.length,
      evidenceCount: totalEvidence,
      rkUsed: usedPlanIds.size,
      rkTotal: activePlans.length,
      avgProgress,
      linked,
      emptyWorkdayDates: workdaysCounted.filter((d) => !periodActivities.some((a) => a.date === d)),
    };
  }, [periodActivities, plans, config, year, month, skpPeriod]);

  const followUps: FollowUpGroup[] = useMemo(
    () => [
      { key: 'no-evidence', label: 'Tanpa bukti', activities: periodActivities.filter((a) => a.evidenceCount === 0) },
      { key: 'no-achievement', label: 'Tanpa capaian', activities: periodActivities.filter((a) => a.achievement.trim().length === 0) },
      { key: 'no-plan', label: 'Tanpa RK', activities: periodActivities.filter((a) => !a.performancePlanId) },
      { key: 'no-link', label: 'Tanpa Link Bukti Dukung', activities: periodActivities.filter((a) => !a.evidenceLink) },
      { key: 'incomplete', label: 'Progress < 100%', activities: periodActivities.filter((a) => a.progress < 100) },
      { key: 'draft', label: 'Masih draft', activities: periodActivities.filter((a) => a.status === 'draft') },
    ],
    [periodActivities]
  );

  const checklist = useMemo(() => {
    const total = periodActivities.length;
    const allWorkdaysFilled = metrics.emptyWorkdayDates.length === 0;
    const allHavePlan = total > 0 && periodActivities.every((a) => a.performancePlanId);
    const allHaveAchievement = total > 0 && periodActivities.every((a) => a.achievement.trim().length > 0);
    const allProgressUpdated = total > 0 && periodActivities.every((a) => a.progress === 100);
    const allHaveEvidence = total > 0 && periodActivities.every((a) => a.evidenceCount > 0);
    const allPackaged = total > 0 && periodActivities.every((a) => a.evidenceLinkStatus === 'packaged' || a.evidenceLinkStatus === 'uploaded');
    const allLinked = total > 0 && periodActivities.every((a) => a.evidenceLinkStatus === 'uploaded');
    const allReadyForKipApp = total > 0 && periodActivities.every((a) => a.status === 'ready_to_report' || a.status === 'reported');

    return [
      { label: 'Semua hari kerja tercatat', done: allWorkdaysFilled },
      { label: 'Semua kegiatan punya Rencana Kinerja', done: allHavePlan },
      { label: 'Semua kegiatan punya capaian', done: allHaveAchievement },
      { label: 'Progress diperbarui (100%)', done: allProgressUpdated },
      { label: 'Bukti dukung tersedia', done: allHaveEvidence },
      { label: 'Berkas Data Dukung dibuat', done: allPackaged },
      { label: 'Tautan tersimpan', done: allLinked },
      { label: 'Siap dipindahkan ke KipApp', done: allReadyForKipApp },
    ];
  }, [periodActivities, metrics.emptyWorkdayDates]);

  async function handleDuplicate(activity: Activity) {
    if (!settings) return;
    await activityRepository.save(duplicateActivity(activity, settings));
  }

  async function requestDelete(activity: Activity) {
    const evidence = await evidenceRepository.listByActivity(activity.id);
    setDeleteEvidenceCount(evidence.length);
    setDeleteTarget(activity);
  }

  if (activities === undefined) return null;

  const yearOptions = Array.from(new Set([year, now.getFullYear(), now.getFullYear() - 1])).sort((a, b) => b - a);

  return (
    <div>
      <PageHeader
        title="Monthly Review"
        description="Tinjau kelengkapan catatan kinerja bulan ini sebelum dipindahkan ke KipApp."
        actions={
          <a href="#/laporan?period=bulanan">
            <Button>Buat Laporan Bulanan</Button>
          </a>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Tahun</label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Bulan</label>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES_ID.map((name, i) => (
                <SelectItem key={name} value={String(i + 1)}>
                  {name} {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricTile label="Coverage" value={`${metrics.coverage}%`} sub={`${metrics.filled}/${metrics.workdaysCounted} hari kerja`} />
        <MetricTile label="Hari Kerja" value={String(metrics.workdaysInMonth)} sub="bulan ini" />
        <MetricTile label="Kegiatan" value={String(metrics.activityCount)} />
        <MetricTile label="Bukti Dukung" value={String(metrics.evidenceCount)} />
        <MetricTile label="RK Terpakai" value={`${metrics.rkUsed}/${metrics.rkTotal}`} />
        <MetricTile label="Rata-rata Progress" value={String(metrics.avgProgress)} />
        <MetricTile label="Bertautan" value={`${metrics.linked}/${metrics.activityCount}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tindak Lanjut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {followUps.map((group) => (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => setExpandedGroup((k) => (k === group.key ? null : group.key))}
                  className="flex w-full items-center justify-between rounded-control px-2 py-1.5 text-sm hover:bg-accent"
                  disabled={group.activities.length === 0}
                >
                  <span className="flex items-center gap-1.5">
                    {expandedGroup === group.key ? (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {group.label}
                  </span>
                  <span className={group.activities.length > 0 ? 'text-warning' : 'text-muted-foreground'}>
                    {group.activities.length}
                  </span>
                </button>
                {expandedGroup === group.key && group.activities.length > 0 ? (
                  <div className="ml-5 mt-1 space-y-2 border-l border-border pl-3">
                    {group.activities.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        plan={activity.performancePlanId ? (planById.get(activity.performancePlanId) ?? null) : null}
                        onEdit={() => openEdit(activity.id)}
                        onDuplicate={() => void handleDuplicate(activity)}
                        onDelete={() => void requestDelete(activity)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {metrics.emptyWorkdayDates.length > 0 ? (
              <div>
                <button
                  type="button"
                  onClick={() => setExpandedGroup((k) => (k === 'empty-workdays' ? null : 'empty-workdays'))}
                  className="flex w-full items-center justify-between rounded-control px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <span className="flex items-center gap-1.5">
                    {expandedGroup === 'empty-workdays' ? (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Hari kerja kosong
                  </span>
                  <span className="text-warning">{metrics.emptyWorkdayDates.length}</span>
                </button>
                {expandedGroup === 'empty-workdays' ? (
                  <p className="ml-5 mt-1 border-l border-border pl-3 text-xs text-muted-foreground">
                    {metrics.emptyWorkdayDates.join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Month-end Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className={item.done ? '' : 'text-muted-foreground'}>{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <DeleteActivityDialog
        activity={deleteTarget}
        evidenceCount={deleteEvidenceCount}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-xl font-semibold">{value}</p>
      {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
