import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { computeDayIndicator } from '@/lib/services/calendar-indicators';
import { todayString } from '@/lib/date/date-utils';
import type { Activity } from '@/types';
import type { WorkdayConfig } from '@/lib/date/workdays';

const WEEKDAY_HEADERS = ['Sen', 'Sel', 'Rab', 'Kam', "Jum'at", 'Sab', 'Min'];

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

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const activity of activities) {
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
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const dayActivities = activitiesByDate.get(date) ?? [];
          const indicator = computeDayIndicator(date, dayActivities, config, today);
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const isWeekendOrHoliday = !indicator.isWorkday;
          // Tanggal yang sudah ada kegiatannya diberi latar navy penuh supaya
          // terbaca sekilas dari seberang grid — titik kecil 6px sebelumnya
          // menuntut pembaca memeriksa satu per satu. Kegiatan berstatus arsip
          // tidak dihitung (lihat computeDayIndicator), sama seperti titiknya.
          const isFilled = indicator.activityCount > 0;

          const summary = summarize(indicator);

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              aria-label={`${date}: ${summary}`}
              title={summary}
              className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-control border text-sm',
                isWeekendOrHoliday ? 'bg-muted/40 text-muted-foreground' : 'bg-background',
                // Sesudah kelas akhir pekan, supaya isian menang atas keduanya:
                // hari Sabtu yang ada kegiatannya tetap tampil terisi.
                isFilled && 'bg-calendar-filled text-calendar-filled-foreground',
                indicator.isPastWorkdayEmpty && 'border-dashed border-warning',
                !indicator.isPastWorkdayEmpty && 'border-border',
                isFilled && 'border-calendar-filled',
                isSelected && 'ring-2 ring-primary',
                isToday && 'font-bold ring-2 ring-foreground'
              )}
            >
              <span>{Number(date.slice(-2))}</span>
              <span className="mt-0.5 flex items-center gap-0.5">
                {indicator.activityCount > 0 ? (
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      indicator.allCompleteWithLink && 'bg-calendar-dot-complete',
                      !indicator.allCompleteWithLink && indicator.hasDraft && 'bg-calendar-dot-draft',
                      !indicator.allCompleteWithLink &&
                        !indicator.hasDraft &&
                        indicator.hasLowProgress &&
                        'bg-calendar-dot-attention'
                    )}
                    aria-hidden="true"
                  />
                ) : null}
                {indicator.hasNoEvidenceLink && indicator.activityCount > 0 ? (
                  <span className="text-[9px] text-calendar-dot-alert" aria-hidden="true">
                    ⛓
                  </span>
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
