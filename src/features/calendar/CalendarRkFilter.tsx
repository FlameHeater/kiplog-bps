import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';

interface CalendarRkFilterProps {
  value: string | null;
  onChange: (planId: string | null) => void;
}

// "Semua RK ▾" chip — same Popover-trigger-chip pattern as MonthPicker, so
// the Kalender toolbar's two dropdowns read as one family.
export function CalendarRkFilter({ value, onChange }: CalendarRkFilterProps) {
  const plans = usePerformancePlans();
  const [open, setOpen] = useState(false);

  const active = plans?.find((p) => p.id === value) ?? null;
  const label = active ? (active.displayName ?? active.name) : 'Semua RK';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="max-w-[12rem] justify-between gap-2">
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="max-h-80 space-y-0.5 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={cn(
              'flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-sm hover:bg-accent',
              value === null && 'bg-accent'
            )}
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
            <span className="flex-1 truncate">Semua RK</span>
            {value === null ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
          </button>
          {(plans ?? []).map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => {
                onChange(plan.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-sm hover:bg-accent',
                value === plan.id && 'bg-accent'
              )}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: plan.color }}
                aria-hidden="true"
              />
              <span className="flex-1 truncate">{plan.displayName ?? plan.name}</span>
              {value === plan.id ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
