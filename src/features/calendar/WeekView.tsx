import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { addDays, getWeekday } from '@/lib/date/date-utils';
import type { Activity } from '@/types';

const WEEKDAY_LABELS = ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu', 'Minggu'];

function startOfWeek(date: string): string {
  const offset = (getWeekday(date) + 6) % 7; // Monday-first
  return addDays(date, -offset);
}

interface WeekViewProps {
  anchorDate: string;
  activities: Activity[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

// FR-CAL-09: agenda per hari, bukan grid jam.
export function WeekView({ anchorDate, activities, selectedDate, onSelectDate }: WeekViewProps) {
  const days = useMemo(() => {
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchorDate]);

  const byDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of activities) {
      const list = map.get(a.date) ?? [];
      list.push(a);
      map.set(a.date, list);
    }
    return map;
  }, [activities]);

  return (
    <div className="space-y-2">
      {days.map((date, i) => {
        const dayActivities = byDate.get(date) ?? [];
        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelectDate(date)}
            className={cn(
              'flex w-full items-center justify-between rounded-control border border-border p-3 text-left text-sm',
              date === selectedDate && 'ring-2 ring-primary'
            )}
          >
            <span>
              <span className="font-medium">{WEEKDAY_LABELS[i]}</span>{' '}
              <span className="text-muted-foreground">{date}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {dayActivities.length > 0 ? `${dayActivities.length} kegiatan` : 'Kosong'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
