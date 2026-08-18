import { Paperclip, Link2, Link2Off, Copy, CalendarRange, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Activity, PerformancePlan } from '@/types';
import {
  ACTIVITY_STATUS_LABELS,
  STATUS_BADGE_CLASS,
  STATUS_CARD_CLASS,
} from './activity-status-labels';
import { formatIndonesianDate } from '@/lib/date/date-utils';

interface ActivityCardProps {
  activity: Activity;
  plan: PerformancePlan | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onDuplicateRange?: () => void;
  onDelete: () => void;
}

// §14.5 wireframe.
export function ActivityCard({
  activity,
  plan,
  onEdit,
  onDuplicate,
  onDuplicateRange,
  onDelete,
}: ActivityCardProps) {
  const locked = activity.sentForReview;

  return (
    <div
      className={`rounded-card border border-l-4 border-border p-4 ${STATUS_CARD_CLASS[activity.status]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {formatIndonesianDate(activity.date)}
          {activity.startTime && activity.endTime ? (
            <>
              {' '}
              · {activity.startTime} – {activity.endTime} ·{' '}
              {Math.floor(activity.durationMinutes / 60)}j {activity.durationMinutes % 60}m
            </>
          ) : (
            <> · Jam tidak dicatat</>
          )}
        </p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[activity.status]}`}
        >
          {ACTIVITY_STATUS_LABELS[activity.status]}
        </span>
      </div>

      <p className="mt-2 text-sm font-medium text-foreground">{activity.description}</p>

      {plan ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: plan.color }}
            aria-hidden="true"
          />
          <span className="line-clamp-1" title={plan.name}>
            {plan.displayName ?? plan.name}
          </span>
          <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px]">
            {plan.type}
          </span>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Belum ada Rencana Kinerja</p>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex flex-1 items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary" style={{ width: `${activity.progress}%` }} />
          </div>
          <span>{activity.progress}</span>
        </div>
        <span className="flex items-center gap-1">
          <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> {activity.evidenceCount}
        </span>
        {activity.evidenceLink ? (
          <span className="flex items-center gap-1 text-success">
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> ada
          </span>
        ) : (
          <span className="flex items-center gap-1 text-warning">
            <Link2Off className="h-3.5 w-3.5" aria-hidden="true" /> belum
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {activity.countsTowardSkp ? '✓ Masuk capaian SKP' : 'Tidak masuk capaian SKP'}
        </p>
        {activity.tags.length > 0 ? (
          <p className="text-xs text-muted-foreground">#{activity.tags.join(' #')}</p>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {locked ? 'Lihat' : 'Ubah'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Duplikat
        </Button>
        {onDuplicateRange ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={onDuplicateRange}
            aria-label="Duplikat ke rentang tanggal"
          >
            <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}
        {!locked ? (
          <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
