import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Lock, LockOpen, Wand2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useActivities } from '@/hooks/useActivities';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';
import { useSettings } from '@/hooks/useSettings';
import { useSkpPeriod } from '@/hooks/useSkpPeriod';
import { usePlanPeriodStatuses } from '@/hooks/usePlanPeriodStatuses';
import { CopyModePanel } from '@/features/kipapp-ready/CopyModePanel';
import { AutofillSetupCard } from '@/features/kipapp-ready/AutofillSetupCard';
import { buildAutofillBatch, serializeAutofillBatch } from '@/lib/services/kipapp-autofill';
import {
  markActivityReported,
  setPeriodLocked,
  setPlanCompleted,
  unmarkActivityReported,
} from '@/lib/services/kipapp-ready';
import { buildSalinSemuaText } from '@/lib/services/copy-mode-text';
import { formatIndonesianDate } from '@/lib/date/date-utils';
import {
  groupActivitiesByDate,
  groupActivitiesByPlan,
  type DateGroup,
  type DateOrder,
  type GroupBy,
  type PlanGroup,
} from '@/lib/services/kipapp-ready-grouping';
import { copyToClipboard } from '@/lib/utils/clipboard';
import type { PerformancePlan } from '@/types';

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function isTypingTarget(el: EventTarget | null): boolean {
  const tag = (el as HTMLElement | null)?.tagName;
  return (
    tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement | null)?.isContentEditable === true
  );
}

// FR-KAR-01…12, §14.6 — grouped-per-RK Copy Mode, meniru urutan kerja KipApp (§3.3).
export function KipAppReadyPage() {
  const activities = useActivities();
  const plans = usePerformancePlans();
  const settings = useSettings();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const skpPeriod = `${year}-${String(month).padStart(2, '0')}`;

  const skpPeriodRecord = useSkpPeriod(skpPeriod);
  const planStatuses = usePlanPeriodStatuses(skpPeriod);

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [groupByLeader, setGroupByLeader] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('rk');
  const [dateOrder, setDateOrder] = useState<DateOrder>('asc');
  const [batchNote, setBatchNote] = useState<string | null>(null);

  const planById = useMemo(() => new Map((plans ?? []).map((p) => [p.id, p])), [plans]);

  const periodActivities = useMemo(
    () => (activities ?? []).filter((a) => a.skpPeriod === skpPeriod && a.status !== 'archived'),
    [activities, skpPeriod]
  );

  const groups = useMemo(
    () => groupActivitiesByPlan(periodActivities, planById, dateOrder),
    [periodActivities, planById, dateOrder]
  );

  const dateGroups = useMemo(
    () => groupActivitiesByDate(periodActivities, dateOrder),
    [periodActivities, dateOrder]
  );

  const flatOrder = useMemo(
    () =>
      groupBy === 'tanggal'
        ? dateGroups.flatMap((g) => g.activities.map((a) => a.id))
        : groups.flatMap((g) => g.activities.map((a) => a.id)),
    [groups, dateGroups, groupBy]
  );

  const totalActivities = periodActivities.length;
  const reportedActivities = periodActivities.filter((a) => a.status === 'reported').length;
  const totalPlans = groups.filter((g) => g.plan).length;
  const completedPlans = groups.filter(
    (g) => g.plan && g.activities.every((a) => a.status === 'reported')
  ).length;

  /**
   * Menyalin seluruh periode sebagai satu antrean.
   *
   * Bookmarklet yang membaginya jadi sesi, bukan halaman ini: KipApp hanya
   * menerima satu kegiatan per dialog, jadi yang bisa diringkas adalah
   * penyiapannya — sekali salin, lalu antreannya yang mengingat sudah sampai
   * mana.
   */
  async function copyBatch() {
    const { batch, skipped } = buildAutofillBatch(periodActivities, planById);
    if (batch.items.length === 0) {
      setBatchNote('Tidak ada kegiatan yang siap dikirim pada periode ini.');
      return;
    }
    const copied = await copyToClipboard(serializeAutofillBatch(batch));
    setBatchNote(
      copied
        ? `${batch.items.length} kegiatan tersalin sebagai antrean` +
            (skipped.length > 0 ? ` · ${skipped.length} dilewati (belum siap kirim)` : '') +
            '. Tempel sekali di panel bookmarklet KipApp.'
        : 'Gagal menyalin ke papan klip.'
    );
  }

  function groupId(plan: PerformancePlan | null): string {
    return plan?.id ?? '__none__';
  }

  function isCollapsed(gid: string, fullyReported: boolean): boolean {
    return overrides[gid] ?? fullyReported;
  }

  function toggleGroup(gid: string, current: boolean) {
    setOverrides((prev) => ({ ...prev, [gid]: !current }));
  }

  // FR-KAR-10: J/K navigate, C copy-all, Space toggle mark-reported on the focused card.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (flatOrder.length === 0) return;
      const currentIndex = focusedId ? flatOrder.indexOf(focusedId) : -1;

      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setFocusedId(
          flatOrder[Math.min(currentIndex + 1, flatOrder.length - 1)] ?? flatOrder[0] ?? null
        );
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setFocusedId(flatOrder[Math.max(currentIndex - 1, 0)] ?? flatOrder[0] ?? null);
      } else if ((e.key === 'c' || e.key === 'C') && focusedId) {
        const activity = periodActivities.find((a) => a.id === focusedId);
        if (activity) void copyToClipboard(buildSalinSemuaText(activity));
      } else if (e.key === ' ' && focusedId) {
        e.preventDefault();
        const activity = periodActivities.find((a) => a.id === focusedId);
        if (activity) {
          if (activity.status === 'reported') void unmarkActivityReported(activity.id);
          else void markActivityReported(activity.id);
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flatOrder, focusedId, periodActivities]);

  const leaderGroups = useMemo(() => {
    if (!groupByLeader) return null;
    const byLeader = new Map<string, PlanGroup[]>();
    for (const group of groups) {
      const leader = group.plan?.teamLeader?.trim() || 'Tanpa Ketua Tim';
      const list = byLeader.get(leader) ?? [];
      list.push(group);
      byLeader.set(leader, list);
    }
    return byLeader;
  }, [groups, groupByLeader]);

  if (activities === undefined) return null;

  const yearOptions = Array.from(new Set([year, now.getFullYear(), now.getFullYear() - 1])).sort(
    (a, b) => b - a
  );

  function renderGroup(group: PlanGroup) {
    const gid = groupId(group.plan);
    const total = group.activities.length;
    const reported = group.activities.filter((a) => a.status === 'reported').length;
    const fullyReported = total > 0 && reported === total;
    const collapsed = isCollapsed(gid, fullyReported);
    const isPlanCompleted = group.plan ? (planStatuses?.get(group.plan.id) ?? false) : false;

    return (
      <div key={gid} className="rounded-card border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3">
          <button
            type="button"
            onClick={() => toggleGroup(gid, collapsed)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="truncate text-sm font-medium">
              {group.plan ? (group.plan.displayName ?? group.plan.name) : 'Tanpa Rencana Kinerja'}
            </span>
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs">
              {reported}/{total} {isPlanCompleted ? '✓' : ''}
            </span>
          </button>
          <div className="flex shrink-0 gap-2">
            {group.plan ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void copyToClipboard(group.plan?.name ?? '')}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Salin Nama RK
              </Button>
            ) : null}
            {group.plan ? (
              <Button
                type="button"
                size="sm"
                variant={isPlanCompleted ? 'secondary' : 'outline'}
                onClick={() => void setPlanCompleted(group.plan!.id, skpPeriod, !isPlanCompleted)}
              >
                {isPlanCompleted ? '✓ RK Selesai' : 'Tandai RK Selesai'}
              </Button>
            ) : null}
          </div>
        </div>
        {!collapsed ? (
          <div className="space-y-3 border-t border-border p-3">
            {group.activities.map((activity) => (
              <CopyModePanel
                key={activity.id}
                activity={activity}
                plan={group.plan}
                isFocused={focusedId === activity.id}
                requireEvidenceLinkForReady={settings?.requireEvidenceLinkForReady ?? true}
                onFocus={() => setFocusedId(activity.id)}
                onMarkReported={() => void markActivityReported(activity.id)}
                onUnmarkReported={() => void unmarkActivityReported(activity.id)}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  function renderDateGroup(group: DateGroup) {
    const gid = `tanggal:${group.date}`;
    const total = group.activities.length;
    const reported = group.activities.filter((a) => a.status === 'reported').length;
    const collapsed = isCollapsed(gid, total > 0 && reported === total);

    return (
      <div key={gid} className="rounded-card border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3">
          <button
            type="button"
            onClick={() => toggleGroup(gid, collapsed)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="truncate text-sm font-medium">{formatIndonesianDate(group.date)}</span>
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs">
              {reported}/{total}
            </span>
          </button>
        </div>
        {!collapsed ? (
          <div className="space-y-3 border-t border-border p-3">
            {group.activities.map((activity) => (
              <CopyModePanel
                key={activity.id}
                activity={activity}
                plan={
                  activity.performancePlanId
                    ? (planById.get(activity.performancePlanId) ?? null)
                    : null
                }
                isFocused={focusedId === activity.id}
                requireEvidenceLinkForReady={settings?.requireEvidenceLinkForReady ?? true}
                onFocus={() => setFocusedId(activity.id)}
                onMarkReported={() => void markActivityReported(activity.id)}
                onUnmarkReported={() => void unmarkActivityReported(activity.id)}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="KipApp Ready"
        description="Salin atau autofill data KipLog ke form KipApp, lalu tandai yang sudah selesai."
        actions={
          <Button
            type="button"
            variant={skpPeriodRecord?.isLocked ? 'secondary' : 'outline'}
            onClick={() =>
              void setPeriodLocked(skpPeriod, skpPeriodRecord ?? null, !skpPeriodRecord?.isLocked)
            }
          >
            {skpPeriodRecord?.isLocked ? (
              <>
                <Lock className="h-4 w-4" aria-hidden="true" /> Periode Terkunci
              </>
            ) : (
              <>
                <LockOpen className="h-4 w-4" aria-hidden="true" /> Kunci Periode
              </>
            )}
          </Button>
        }
      />

      {skpPeriodRecord?.isLocked ? (
        <p className="mb-4 rounded-card border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
          Di KipApp, mencentang Kirim SKP untuk dinilai membuat seluruh bulan tidak dapat diedit
          lagi. Kegiatan pada periode ini kini bersifat baca-saja di KipLog.
        </p>
      ) : null}

      <div className="mb-4">
        <AutofillSetupCard />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-border bg-card p-3">
        <Button type="button" size="sm" onClick={() => void copyBatch()}>
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          Salin sebulan untuk Autofill
        </Button>
        <p className="text-xs text-muted-foreground">
          {batchNote ??
            'Sekali salin untuk seluruh periode; panel bookmarklet di KipApp yang membaginya per kegiatan dan per tanggal.'}
        </p>
      </div>

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
          <label className="text-xs font-medium text-muted-foreground">Periode SKP</label>
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
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Kelompokkan</label>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rk">Rencana Kinerja</SelectItem>
              <SelectItem value="tanggal">Tanggal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Urutan tanggal</label>
          <Select value={dateOrder} onValueChange={(v) => setDateOrder(v as DateOrder)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Terlama dulu</SelectItem>
              <SelectItem value="desc">Terbaru dulu</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {groupBy === 'rk' ? (
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Switch checked={groupByLeader} onCheckedChange={setGroupByLeader} />
            Kelompokkan per Ketua Tim
          </label>
        ) : null}
        <p className="pb-2 text-xs text-muted-foreground">
          {reportedActivities} dari {totalActivities} kegiatan sudah ditandai · RK {completedPlans}{' '}
          dari {totalPlans}
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="Tidak ada kegiatan pada periode ini."
          action={
            <Button
              onClick={() => {
                setYear(now.getFullYear());
                setMonth(now.getMonth() + 1);
              }}
            >
              Ubah Periode
            </Button>
          }
        />
      ) : groupBy === 'tanggal' ? (
        <div className="space-y-3">{dateGroups.map(renderDateGroup)}</div>
      ) : groupByLeader && leaderGroups ? (
        <div className="space-y-6">
          {[...leaderGroups.entries()].map(([leader, leaderPlanGroups]) => {
            const leaderTotal = leaderPlanGroups.reduce((sum, g) => sum + g.activities.length, 0);
            const leaderRkCount = leaderPlanGroups.filter((g) => g.plan).length;
            return (
              <div key={leader}>
                <h3 className="mb-2 text-sm font-semibold">
                  {leader} — {leaderRkCount} RK, {leaderTotal} kegiatan
                </h3>
                <div className="space-y-3">{leaderPlanGroups.map(renderGroup)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">{groups.map(renderGroup)}</div>
      )}
    </div>
  );
}
