import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { ActivityCard } from '@/features/activities/ActivityCard';
import { DeleteActivityDialog } from '@/features/activities/DeleteActivityDialog';
import { DuplicateRangeDialog } from '@/features/activities/DuplicateRangeDialog';
import { FilterPanel } from '@/features/activities/FilterPanel';
import { useActivityModalStore } from '@/features/activities/activity-modal-store';
import { duplicateActivity } from '@/lib/services/duplicate-activity';
import {
  applyActivityFilters,
  describeActiveFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  type ActivityFilters,
} from '@/lib/services/activity-filters';
import { useActivities } from '@/hooks/useActivities';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';
import { useSettings } from '@/hooks/useSettings';
import { activityRepository, evidenceRepository } from '@/db/repositories';
import { monthRangeContaining } from '@/lib/reporting/report-period';
import { Input } from '@/components/ui/input';
import type { Activity } from '@/types';

// FR-SCH-04/05/06.
export function KegiatanPage() {
  const activities = useActivities();
  const plans = usePerformancePlans();
  const settings = useSettings();
  const openNew = useActivityModalStore((s) => s.openNew);
  const openEdit = useActivityModalStore((s) => s.openEdit);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [deleteEvidenceCount, setDeleteEvidenceCount] = useState(0);
  const [rangeTarget, setRangeTarget] = useState<Activity | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);

  function setFilters(next: ActivityFilters) {
    setSearchParams(filtersToSearchParams(next));
  }

  // Quick month picker next to the filter panel: sets dateFrom/dateTo to the
  // chosen month's first/last day, so users don't have to open the popover
  // and pick two dates just to see one month's activities.
  const monthQuickValue =
    filters.dateFrom && filters.dateFrom === monthRangeContaining(filters.dateFrom).start
      ? filters.dateFrom.slice(0, 7)
      : '';

  function setMonthQuick(month: string) {
    if (!month) {
      const next = { ...filters };
      delete next.dateFrom;
      delete next.dateTo;
      setFilters(next);
      return;
    }
    const { start, end } = monthRangeContaining(`${month}-01`);
    setFilters({ ...filters, dateFrom: start, dateTo: end });
  }

  const planById = useMemo(() => {
    const map = new Map((plans ?? []).map((p) => [p.id, p]));
    return map;
  }, [plans]);

  const chips = useMemo(() => describeActiveFilters(filters, planById), [filters, planById]);

  const filtered = useMemo(
    () => applyActivityFilters(activities ?? [], filters, planById),
    [activities, filters, planById]
  );

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.date.localeCompare(a.date)), [filtered]);

  async function handleDuplicate(activity: Activity) {
    if (!settings) return;
    const copy = duplicateActivity(activity, settings);
    await activityRepository.save(copy);
  }

  async function requestDelete(activity: Activity) {
    const evidence = await evidenceRepository.listByActivity(activity.id);
    setDeleteEvidenceCount(evidence.length);
    setDeleteTarget(activity);
  }

  if (activities === undefined) return null;

  return (
    <div>
      <PageHeader
        title="Kegiatan"
        description={`${filtered.length} dari ${activities.length} kegiatan`}
        actions={
          <div className="flex gap-2">
            <Input
              type="month"
              className="w-[10.5rem]"
              aria-label="Filter bulan"
              value={monthQuickValue}
              onChange={(e) => setMonthQuick(e.target.value)}
            />
            <FilterPanel filters={filters} onChange={setFilters} />
            <Button onClick={() => openNew()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Kegiatan
            </Button>
          </div>
        }
      />

      {chips.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                const next = { ...filters };
                delete next[chip.key];
                if (chip.key === 'progressMin') delete next.progressMax;
                setFilters(next);
              }}
              className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
            >
              {chip.label}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setFilters({})}>
            Hapus semua
          </Button>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState
          title={chips.length > 0 ? 'Tidak ada hasil untuk filter ini.' : 'Belum ada kegiatan.'}
          action={
            chips.length > 0 ? (
              <Button onClick={() => setFilters({})}>Hapus filter</Button>
            ) : (
              <Button onClick={() => openNew()}>+ Tambah Kegiatan</Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sorted.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              plan={activity.performancePlanId ? (planById.get(activity.performancePlanId) ?? null) : null}
              onEdit={() => openEdit(activity.id)}
              onDuplicate={() => void handleDuplicate(activity)}
              onDuplicateRange={() => setRangeTarget(activity)}
              onDelete={() => void requestDelete(activity)}
            />
          ))}
        </div>
      )}

      <DeleteActivityDialog
        activity={deleteTarget}
        evidenceCount={deleteEvidenceCount}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={() => setDeleteTarget(null)}
      />
      <DuplicateRangeDialog
        activity={rangeTarget}
        settings={settings ?? undefined}
        onOpenChange={(open) => !open && setRangeTarget(null)}
      />
    </div>
  );
}
