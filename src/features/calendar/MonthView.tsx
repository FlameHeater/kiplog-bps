import { useMemo } from 'react';
import { Link2Off } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { computeDayIndicator } from '@/lib/services/calendar-indicators';
import { todayString } from '@/lib/date/date-utils';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';
import { STATUS_BADGE_CLASS } from '@/features/activities/activity-status-labels';
import type { Activity } from '@/types';
import type { WorkdayConfig } from '@/lib/date/workdays';

const WEEKDAY_HEADERS = ['Sen', 'Sel', 'Rab', 'Kam', "Jum'at", 'Sab', 'Min'];
const MAX_PILLS = 2;

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface MonthViewProps {
  year: number;
  month: number; // 1-12
  activities: Activity[];
  config: WorkdayConfig;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

export function MonthView({ year, month, activities, config, selectedDate, onSelectDate }: MonthViewProps) {
  const today = todayString();
  const plans = usePerformancePlans();
  const planById = useMemo(() => new Map((plans ?? []).map((p) => [p.id, p])), [plans]);

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const activity of activities) {
      if (activity.status === 'archived') continue;
      const list = map.get(activity.date) ?? [];
      list.push(activity);
      map.set(activity.date, list);
    }
    return map;
  }, [activities]);

  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month - 1, 1);
    // Monday-first grid: JS getDay() is 0=Sunday, shift so Monday=0.
    const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();

    const result: (string | null)[] = Array.from({ length: leadingBlanks }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      result.push(formatDate(year, month, day));
    }
    return result;
  }, [year, month]);

  return (
    <div className="animate-page">
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const dayActivities = activitiesByDate.get(date) ?? [];
          // computeDayIndicator still drives the weekend/holiday/past-empty/
          // missing-link signals below — those stay meaningful even though
          // day content is now per-activity pills instead of one dot.
          const indicator = computeDayIndicator(date, dayActivities, config, today);
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const isWeekendOrHoliday = !indicator.isWorkday;
          const summary = summarize(indicator);
          const visiblePills = dayActivities.slice(0, MAX_PILLS);
          const extraCount = dayActivities.length - visiblePills.length;

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              aria-label={`${date}: ${summary}`}
              title={summary}
              className={cn(
                'group flex min-h-[5.5rem] flex-col items-stretch gap-1 rounded-card border p-1.5 text-left text-sm',
                'transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-elevation-1 active:translate-y-0 active:scale-[0.98]',
                isWeekendOrHoliday ? 'bg-muted/40' : 'bg-background',
                indicator.isPastWorkdayEmpty && 'border-dashed border-warning',
                !indicator.isPastWorkdayEmpty && 'border-border',
                isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              )}
            >
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    'text-xs',
                    isWeekendOrHoliday ? 'text-muted-foreground' : 'text-foreground',
                    isToday && 'font-bold underline decoration-2 underline-offset-[3px]'
                  )}
                >
                  {Number(date.slice(-2))}
                </span>
                {indicator.hasNoEvidenceLink && indicator.activityCount > 0 ? (
                  <Link2Off className="h-2.5 w-2.5 shrink-0 text-calendar-dot-alert" aria-hidden="true" />
                ) : null}
              </span>

              <span className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                {visiblePills.map((activity) => {
                  const plan = activity.performancePlanId ? planById.get(activity.performancePlanId) : undefined;
                  return (
                    <span
                      key={activity.id}
                      className={cn(
                        'truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight',
                        !plan && STATUS_BADGE_CLASS[activity.status]
                      )}
                      style={
                        plan
                          ? { backgroundColor: `${plan.color}26`, color: plan.color }
                          : undefined
                      }
                    >
                      {activity.description || '(Tanpa judul)'}
                    </span>
                  );
                })}
                {extraCount > 0 ? (
                  <span className="text-[10px] text-muted-foreground">+{extraCount} lainnya</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function summarize(indicator: ReturnType<typeof computeDayIndicator>): string {
  if (indicator.activityCount === 0) {
    return indicator.isPastWorkdayEmpty ? 'Hari kerja, belum ada kegiatan' : 'Tidak ada kegiatan';
  }
  const parts = [`${indicator.activityCount} kegiatan`];
  if (indicator.allCompleteWithLink) parts.push('lengkap dan bertautan');
  if (indicator.hasNoEvidenceLink) parts.push('ada yang belum punya Link Bukti Dukung');
  if (indicator.hasNoEvidence) parts.push('ada yang belum punya bukti');
  if (indicator.hasLowProgress) parts.push('ada progress belum 100');
  return parts.join(', ');
}
