import { useMemo } from 'react';
import { addDays, formatIndonesianDate, getWeekday, todayString } from '@/lib/date/date-utils';
import type { Activity } from '@/types';

interface ActivityHeatmapProps {
  activities: Activity[];
}

const INTENSITY_CLASSES = [
  'bg-secondary',
  'bg-primary/25',
  'bg-primary/50',
  'bg-primary/75',
  'bg-primary',
];

function intensityClass(count: number): string {
  if (count === 0) return INTENSITY_CLASSES[0] as string;
  if (count === 1) return INTENSITY_CLASSES[1] as string;
  if (count === 2) return INTENSITY_CLASSES[2] as string;
  if (count <= 4) return INTENSITY_CLASSES[3] as string;
  return INTENSITY_CLASSES[4] as string;
}

// FR-DSH-08 — last ~12 months as a GitHub-style contribution grid (weeks × weekdays).
export function ActivityHeatmap({ activities }: ActivityHeatmapProps) {
  const today = todayString();

  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const activity of activities) {
      if (activity.status === 'archived') continue;
      map.set(activity.date, (map.get(activity.date) ?? 0) + 1);
    }
    return map;
  }, [activities]);

  const weeks = useMemo(() => {
    // Start on the Monday of the week 371 days ago, end today.
    const startRaw = addDays(today, -371);
    const startWeekday = getWeekday(startRaw); // 0=Sun..6=Sat
    const mondayOffset = startWeekday === 0 ? -6 : 1 - startWeekday;
    const start = addDays(startRaw, mondayOffset);

    const result: string[][] = [];
    let cursor = start;
    while (cursor <= today) {
      const week: string[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(cursor);
        cursor = addDays(cursor, 1);
      }
      result.push(week);
    }
    return result;
  }, [today]);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {weeks.map((week, i) => (
          <div key={i} className="flex flex-col gap-1">
            {week.map((date) => {
              const count = countByDate.get(date) ?? 0;
              const inRange = date <= today;
              return (
                <div
                  key={date}
                  title={`${formatIndonesianDate(date)}: ${count} kegiatan`}
                  className={`h-2.5 w-2.5 rounded-sm ${inRange ? intensityClass(count) : 'bg-transparent'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {countByDate.size} hari tercatat dalam 12 bulan terakhir (hingga {formatIndonesianDate(today)}).
      </p>
    </div>
  );
}
