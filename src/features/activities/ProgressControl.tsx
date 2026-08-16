import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ProgressControlProps {
  value: number;
  onChange: (value: number) => void;
}

const QUICK_VALUES = [0, 25, 50, 75, 100];

// FR-ACT-06: slider + numeric input kept in sync, plus quick-set buttons.
export function ProgressControl({ value, onChange }: ProgressControlProps) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer accent-primary"
          aria-label="Progress kegiatan"
        />
        <Input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
          className="w-20"
        />
      </div>
      <div className="mt-2 flex gap-1.5">
        {QUICK_VALUES.map((v) => (
          <Button
            key={v}
            type="button"
            size="sm"
            variant={value === v ? 'default' : 'outline'}
            onClick={() => onChange(v)}
          >
            {v}
          </Button>
        ))}
      </div>
    </div>
  );
}
