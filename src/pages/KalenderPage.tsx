import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { MonthPicker } from '@/components/common/MonthPicker';
import { MonthView } from '@/features/calendar/MonthView';
import { AgendaView } from '@/features/calendar/AgendaView';
import { WeekView } from '@/features/calendar/WeekView';
import { DayPanel } from '@/features/calendar/DayPanel';
import { CalendarRkFilter } from '@/features/calendar/CalendarRkFilter';
import { useActivities } from '@/hooks/useActivities';
import { useSettings } from '@/hooks/useSettings';
import { useActivityModalStore } from '@/features/activities/activity-modal-store';
import { addDays, addMonths, formatIndonesianDate, formatIndonesianWeekday, todayString } from '@/lib/date/date-utils';

type ViewMode = 'bulan' | 'minggu' | 'hari';

// FR-CAL-01..09.
export function KalenderPage() {
  const today = todayString();
  const [view, setView] = useState<ViewMode>('bulan');
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [rkFilter, setRkFilter] = useState<string | null>(null);

  const allActivities = useActivities();
  const settings = useSettings();
  const openNew = useActivityModalStore((s) => s.openNew);

  const activities = useMemo(
    () => (rkFilter ? (allActivities ?? []).filter((a) => a.performancePlanId === rkFilter) : (allActivities ?? [])),
    [allActivities, rkFilter]
  );

  const config = useMemo(
    () => ({ workdays: settings?.workdays ?? [1, 2, 3, 4, 5], holidays: settings?.holidays ?? [] }),
    [settings]
  );

  function goToToday() {
    setYear(Number(today.slice(0, 4)));
    setMonth(Number(today.slice(5, 7)));
    setSelectedDate(today);
  }

  // FR-CAL-06: keyboard nav — ←/→ prev/next month, T = hari ini.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        setYear((y) => addMonths(y, month, -1).year);
        setMonth((m) => addMonths(year, m, -1).month);
      } else if (e.key === 'ArrowRight') {
        setYear((y) => addMonths(y, month, 1).year);
        setMonth((m) => addMonths(year, m, 1).month);
      } else if (e.key === 't' || e.key === 'T') {
        goToToday();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, today]);

  function goToMonth(delta: number) {
    const next = addMonths(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  }

  const monthAnchor = `${year}-${String(month).padStart(2, '0')}`;
  function setMonthAnchor(value: string) {
    if (!value) return;
    setYear(Number(value.slice(0, 4)));
    setMonth(Number(value.slice(5, 7)));
  }

  const dayActivities = useMemo(
    () => activities.filter((a) => a.date === selectedDate),
    [activities, selectedDate]
  );

  return (
    <div>
      <PageHeader
        title="Kalender"
        description="Lihat, tambah, dan kelola kegiatan Anda."
        icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-control border border-border p-1">
              {(['bulan', 'minggu', 'hari'] as ViewMode[]).map((v) => (
                <Button key={v} size="sm" variant={view === v ? 'default' : 'ghost'} onClick={() => setView(v)}>
                  {v === 'bulan' ? 'Bulan' : v === 'minggu' ? 'Minggu' : 'Hari'}
                </Button>
              ))}
            </div>
            <Button onClick={() => openNew(selectedDate ?? today)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Kegiatan Baru
            </Button>
          </div>
        }
      />

      {view === 'bulan' ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={goToToday}>
              Hari ini
            </Button>
            <Button size="icon" variant="outline" onClick={() => goToMonth(-1)} aria-label="Bulan sebelumnya">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => goToMonth(1)} aria-label="Bulan berikutnya">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <MonthPicker value={monthAnchor} onChange={setMonthAnchor} />
            <div className="ml-auto">
              <CalendarRkFilter value={rkFilter} onChange={setRkFilter} />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="hidden md:block">
              <MonthView
                year={year}
                month={month}
                activities={activities}
                config={config}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>
            <div className="md:hidden">
              <AgendaView
                year={year}
                month={month}
                activities={activities}
                config={config}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>
            {selectedDate ? <DayPanel key={selectedDate} date={selectedDate} activities={dayActivities} /> : null}
          </div>
        </>
      ) : null}

      {view === 'minggu' ? (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <WeekView
            anchorDate={selectedDate ?? today}
            activities={activities}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          {selectedDate ? <DayPanel key={selectedDate} date={selectedDate} activities={dayActivities} /> : null}
        </div>
      ) : null}

      {view === 'hari' ? (
        <div className="max-w-md">
          <div className="mb-3 flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setSelectedDate(addDays(selectedDate ?? today, -1))}
              aria-label="Hari sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-xs text-muted-foreground">{formatIndonesianWeekday(selectedDate ?? today)}</p>
              <p className="text-sm font-medium">{formatIndonesianDate(selectedDate ?? today)}</p>
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setSelectedDate(addDays(selectedDate ?? today, 1))}
              aria-label="Hari berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <DayPanel key={selectedDate ?? today} date={selectedDate ?? today} activities={dayActivities} />
        </div>
      ) : null}
    </div>
  );
}
