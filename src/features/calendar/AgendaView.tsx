import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { computeDayIndicator } from '@/lib/services/calendar-indicators';
import { formatIndonesianWeekday, todayString } from '@/lib/date/date-utils';
import type { Activity } from '@/types';
import type { WorkdayConfig } from '@/lib/date/workdays';

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface AgendaViewProps {
  year: number;
  month: number;
  activities: Activity[];
  config: WorkdayConfig;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

// §14.8 — calendar becomes a scrollable agenda list on mobile (<768px) instead of a cramped grid.
export function AgendaView({ year, month, activities, config, selectedDate, onSelectDate }: AgendaViewProps) {
  const today = todayString();

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const activity of activities) {
      const list = map.get(activity.date) ?? [];
      list.push(activity);
      map.set(activity.date, list);
    }
    return map;
  }, [activities]);

  const days = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const result: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) result.push(formatDate(year, month, day));
    return result;
  }, [year, month]);

  return (
    <div className="divide-y divide-border rounded-card border border-border">
      {days.map((date) => {
        const dayActivities = activitiesByDate.get(date) ?? [];
        const indicator = computeDayIndicator(date, dayActivities, config, today);
        const isToday = date === today;
        const isSelected = date === selectedDate;

        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelectDate(date)}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-3 text-left',
              isSelected && 'bg-accent',
              !indicator.isWorkday && 'bg-muted/30'
            )}
          >
            <div className={cn('w-14 shrink-0 text-sm', isToday && 'font-bold text-primary')}>
              <div>{formatIndonesianWeekday(date)}</div>
              <div className="text-lg">{Number(date.slice(-2))}</div>
            </div>
            <div className="min-w-0 flex-1">
              {dayActivities.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {indicator.isPastWorkdayEmpty ? 'Hari kerja, belum ada kegiatan' : 'Tidak ada kegiatan'}
                </p>
              ) : (
                <p className="truncate text-sm">
                  {indicator.activityCount} kegiatan
                  {indicator.hasNoEvidenceLink ? ' · ada yang belum bertautan' : ''}
                </p>
              )}
            </div>
            {indicator.activityCount > 0 ? (
              <span
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full',
                  indicator.allCompleteWithLink && 'bg-success',
                  !indicator.allCompleteWithLink && indicator.hasDraft && 'bg-muted-foreground',
                  !indicator.allCompleteWithLink && !indicator.hasDraft && indicator.hasLowProgress && 'bg-warning'
                )}
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
