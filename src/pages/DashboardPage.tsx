import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ActivityCard } from '@/features/activities/ActivityCard';
import { DeleteActivityDialog } from '@/features/activities/DeleteActivityDialog';
import { useActivityModalStore } from '@/features/activities/activity-modal-store';
import { MonthView } from '@/features/calendar/MonthView';
import { DayPanel } from '@/features/calendar/DayPanel';
import { AlertPanel } from '@/features/dashboard/AlertPanel';
import { ActivityHeatmap } from '@/features/dashboard/ActivityHeatmap';
import { WeeklyReviewCard } from '@/features/dashboard/WeeklyReviewCard';

// recharts is large (~100KB+ gzip) — keep it out of the main bundle (NFR-02)
// since the chart is a P1 nice-to-have, not needed for first paint.
const RkDistributionChart = lazy(() =>
  import('@/features/dashboard/RkDistributionChart').then((m) => ({ default: m.RkDistributionChart }))
);
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';
import { useActivities } from '@/hooks/useActivities';
import { useSettings } from '@/hooks/useSettings';
import { activityRepository, evidenceRepository } from '@/db/repositories';
import { duplicateActivity } from '@/lib/services/duplicate-activity';
import { getWorkdaysInMonth, countFilledWorkdays, calculateCoverage } from '@/lib/date/workdays';
import { todayString } from '@/lib/date/date-utils';
import type { Activity } from '@/types';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// FR-DSH-01…09 — the default landing page.
export function DashboardPage() {
  const profile = useUserProfile();
  const plans = usePerformancePlans();
  const activities = useActivities();
  const settings = useSettings();

  const today = todayString();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const skpPeriod = `${year}-${String(month).padStart(2, '0')}`;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [deleteEvidenceCount, setDeleteEvidenceCount] = useState(0);
  const openEdit = useActivityModalStore((s) => s.openEdit);

  const config = useMemo(
    () => ({ workdays: settings?.workdays ?? [1, 2, 3, 4, 5], holidays: settings?.holidays ?? [] }),
    [settings]
  );

  const stats = useMemo(() => {
    if (!activities || !plans) return null;
    const periodActivities = activities.filter((a) => a.skpPeriod === skpPeriod && a.status !== 'archived');
    const workdaysInMonth = getWorkdaysInMonth(year, month, config);
    const workdaysUpToToday = getWorkdaysInMonth(year, month, config, today);
    const filledWorkdays = countFilledWorkdays(workdaysUpToToday, periodActivities.map((a) => a.date));
    const coverage = calculateCoverage(filledWorkdays, workdaysUpToToday.length);
    const emptyWorkdays = workdaysUpToToday.length - filledWorkdays;

    const activePlans = plans.filter((p) => p.isActive);
    const usedPlanIds = new Set(periodActivities.map((a) => a.performancePlanId).filter((id): id is string => !!id));
    const totalEvidence = periodActivities.reduce((sum, a) => sum + a.evidenceCount, 0);
    const avgProgress = periodActivities.length
      ? Math.round(periodActivities.reduce((sum, a) => sum + a.progress, 0) / periodActivities.length)
      : 0;

    return {
      workdaysInMonth: workdaysInMonth.length,
      workdaysUpToToday: workdaysUpToToday.length,
      filledWorkdays,
      emptyWorkdays,
      coverage,
      totalActivities: periodActivities.length,
      totalEvidence,
      rkUsed: usedPlanIds.size,
      rkTotal: activePlans.length,
      avgProgress,
      draftCount: periodActivities.filter((a) => a.status === 'draft').length,
      readyCount: periodActivities.filter((a) => a.status === 'ready_to_report').length,
      missingLinkCount: periodActivities.filter((a) => !a.evidenceLink).length,
    };
  }, [activities, plans, config, year, month, skpPeriod, today]);

  const planById = useMemo(() => new Map((plans ?? []).map((p) => [p.id, p])), [plans]);

  const recentActivities = useMemo(
    () => (activities ?? []).slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [activities]
  );

  const periodActivitiesForChart = useMemo(
    () => (activities ?? []).filter((a) => a.skpPeriod === skpPeriod && a.status !== 'archived'),
    [activities, skpPeriod]
  );

  const dayActivities = useMemo(
    () => (activities ?? []).filter((a) => a.date === selectedDate),
    [activities, selectedDate]
  );

  async function handleDuplicate(activity: Activity) {
    if (!settings) return;
    await activityRepository.save(duplicateActivity(activity, settings));
  }

  async function requestDelete(activity: Activity) {
    const evidence = await evidenceRepository.listByActivity(activity.id);
    setDeleteEvidenceCount(evidence.length);
    setDeleteTarget(activity);
  }

  return (
    <div className="space-y-6">
      <div className="-mx-4 -mt-6 rounded-b-card bg-gradient-subtle px-4 pb-6 pt-6 md:-mx-8 md:px-8">
        <PageHeader
          title={`${greeting()}${profile?.name ? `, ${profile.name}` : ''}`}
          description={`${MONTH_NAMES_ID[month - 1]} ${year} · Periode SKP ${skpPeriod}`}
        />
      </div>

      <AlertPanel />

      {stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Coverage" value={`${stats.coverage}%`} sub={`${stats.filledWorkdays}/${stats.workdaysUpToToday} hari kerja`} />
          <StatTile label="Hari Kerja" value={String(stats.workdaysInMonth)} sub="bulan ini" />
          <StatTile label="Hari Terisi" value={String(stats.filledWorkdays)} sub="hingga hari ini" />
          <StatTile label="Hari Kosong" value={String(stats.emptyWorkdays)} warn={stats.emptyWorkdays > 0} />
          <StatTile label="Kegiatan" value={String(stats.totalActivities)} href="/kegiatan" />
          <StatTile label="Bukti Dukung" value={String(stats.totalEvidence)} />
          <StatTile label="RK Terpakai" value={`${stats.rkUsed}/${stats.rkTotal}`} href="/rencana-kinerja" />
          <StatTile label="Rata-rata Progress" value={String(stats.avgProgress)} />
          <StatTile label="Draft" value={String(stats.draftCount)} href="/kegiatan?status=draft" warn={stats.draftCount > 0} />
          <StatTile label="Siap Dilaporkan" value={String(stats.readyCount)} href="/kegiatan?status=ready_to_report" />
          <StatTile
            label="Belum Ada Tautan"
            value={String(stats.missingLinkCount)}
            href="/bukti-tautan"
            warn={stats.missingLinkCount > 0}
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Kalender {MONTH_NAMES_ID[month - 1]}</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthView
              year={year}
              month={month}
              activities={activities ?? []}
              config={config}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedDate ? <DayPanel date={selectedDate} activities={dayActivities} /> : null}
          <WeeklyReviewCard activities={activities ?? []} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribusi per Rencana Kinerja</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat grafik…</p>}>
              <RkDistributionChart activities={periodActivitiesForChart} planById={planById} />
            </Suspense>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas 12 Bulan Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap activities={activities ?? []} />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Kegiatan Terbaru</h2>
        {recentActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada kegiatan.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recentActivities.map((activity) => (
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
        )}
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

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  warn?: boolean;
}

// FR-DSH-09 — clickable summary numbers open a filtered list.
function StatTile({ label, value, sub, href, warn }: StatTileProps) {
  const content = (
    <div
      className={`group relative overflow-hidden rounded-card border border-border/60 bg-card p-3 shadow-elevation-1 transition-all duration-200 ${
        href ? 'hover:-translate-y-0.5 hover:shadow-elevation-2' : ''
      }`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 rounded-l-card ${warn ? 'bg-warning' : 'bg-primary/70'}`}
        aria-hidden="true"
      />
      <p className="pl-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`pl-1.5 font-mono text-2xl font-bold tracking-tight ${warn ? 'text-warning' : 'text-foreground'}`}>
        {value}
      </p>
      {sub ? <p className="pl-1.5 text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
  return href ? (
    <Link to={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
