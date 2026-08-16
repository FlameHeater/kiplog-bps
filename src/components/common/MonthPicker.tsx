import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { MONTH_NAMES_ID, MONTH_NAMES_ID_SHORT } from '@/lib/date/date-utils';

interface MonthPickerProps {
  /** "" (only valid with `clearable`) or "YYYY-MM". */
  value: string;
  onChange: (value: string) => void;
  /** Shows a "Semua bulan" option that clears the value to "". */
  clearable?: boolean;
  className?: string;
}

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth() + 1;

// Custom year+month-grid popover — replaces the native <input type="month">
// (its OS calendar popup read as "kaku"/generic) without going all the way
// to a day-by-day calendar, which the user explicitly didn't want either.
export function MonthPicker({ value, onChange, clearable, className }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => (value ? Number(value.slice(0, 4)) : CURRENT_YEAR));
  const selectedMonth = value ? Number(value.slice(5, 7)) : null;
  const selectedYear = value ? Number(value.slice(0, 4)) : null;

  const label = value
    ? `${MONTH_NAMES_ID[Number(value.slice(5, 7)) - 1]} ${value.slice(0, 4)}`
    : 'Semua bulan';

  function pick(month: number) {
    onChange(`${year}-${String(month).padStart(2, '0')}`);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={cn('justify-between gap-2', className)}>
          {label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="flex items-center justify-between pb-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Tahun sebelumnya"
            onClick={() => setYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="text-sm font-semibold">{year}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Tahun berikutnya"
            onClick={() => setYear((y) => y + 1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_NAMES_ID_SHORT.map((abbrev, i) => {
            const month = i + 1;
            const isSelected = selectedYear === year && selectedMonth === month;
            const isCurrent = year === CURRENT_YEAR && month === CURRENT_MONTH;
            return (
              <button
                key={month}
                type="button"
                onClick={() => pick(month)}
                aria-pressed={isSelected}
                className={cn(
                  'rounded-control px-2 py-1.5 text-xs font-medium transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent',
                  !isSelected && isCurrent ? 'ring-1 ring-inset ring-primary/50' : ''
                )}
              >
                {abbrev}
              </button>
            );
          })}
        </div>
        {clearable ? (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-control border border-input py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Semua bulan
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
