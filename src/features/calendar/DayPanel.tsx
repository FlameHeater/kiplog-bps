import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { ActivityCard } from '@/features/activities/ActivityCard';
import { DeleteActivityDialog } from '@/features/activities/DeleteActivityDialog';
import { DuplicateRangeDialog } from '@/features/activities/DuplicateRangeDialog';
import { useActivityModalStore } from '@/features/activities/activity-modal-store';
import { duplicateActivity } from '@/lib/services/duplicate-activity';
import { activityRepository, evidenceRepository } from '@/db/repositories';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';
import { useSettings } from '@/hooks/useSettings';
import type { Activity } from '@/types';

interface DayPanelProps {
  date: string;
  activities: Activity[];
}

// FR-CAL-04: clicking a date opens this panel with all activities + add button.
export function DayPanel({ date, activities }: DayPanelProps) {
  const plans = usePerformancePlans();
  const settings = useSettings();
  const openNew = useActivityModalStore((s) => s.openNew);
  const openEdit = useActivityModalStore((s) => s.openEdit);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [deleteEvidenceCount, setDeleteEvidenceCount] = useState(0);
  const [rangeTarget, setRangeTarget] = useState<Activity | null>(null);

  const planById = useMemo(() => new Map((plans ?? []).map((p) => [p.id, p])), [plans]);

  async function requestDelete(activity: Activity) {
    const evidence = await evidenceRepository.listByActivity(activity.id);
    setDeleteEvidenceCount(evidence.length);
    setDeleteTarget(activity);
  }

  return (
    <div className="rounded-card border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{date}</h3>
        <Button size="sm" onClick={() => openNew(date)}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Tambah
        </Button>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          title="Belum ada kegiatan pada tanggal ini."
          action={
            <Button size="sm" onClick={() => openNew(date)}>
              + Tambah Kegiatan
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              plan={activity.performancePlanId ? (planById.get(activity.performancePlanId) ?? null) : null}
              onEdit={() => openEdit(activity.id)}
              onDuplicate={() => {
                if (settings) void activityRepository.save(duplicateActivity(activity, settings));
              }}
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
