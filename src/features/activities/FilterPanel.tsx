import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RkCombobox } from '@/features/performance-plans/RkCombobox';
import { ACTIVITY_STATUS_OPTIONS } from './activity-status-labels';
import type { ActivityFilters } from '@/lib/services/activity-filters';
import { SlidersHorizontal } from 'lucide-react';

interface FilterPanelProps {
  filters: ActivityFilters;
  onChange: (filters: ActivityFilters) => void;
}

// FR-SCH-04.
export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  function set<K extends keyof ActivityFilters>(key: K, value: ActivityFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="filter-from" className="text-xs">Dari tanggal</Label>
            <Input
              id="filter-from"
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => set('dateFrom', e.target.value || undefined)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-to" className="text-xs">Sampai tanggal</Label>
            <Input
              id="filter-to"
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => set('dateTo', e.target.value || undefined)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Rencana Kinerja</Label>
          <RkCombobox
            value={filters.performancePlanId ?? null}
            onChange={(id) => set('performancePlanId', id ?? undefined)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select
            value={filters.status ?? '__all'}
            onValueChange={(v) => set('status', v === '__all' ? undefined : (v as ActivityFilters['status']))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Semua status</SelectItem>
              {ACTIVITY_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="filter-progress-min" className="text-xs">Progress min</Label>
            <Input
              id="filter-progress-min"
              type="number"
              min={0}
              max={100}
              value={filters.progressMin ?? ''}
              onChange={(e) => set('progressMin', e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-progress-max" className="text-xs">Progress maks</Label>
            <Input
              id="filter-progress-max"
              type="number"
              min={0}
              max={100}
              value={filters.progressMax ?? ''}
              onChange={(e) => set('progressMax', e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.hasEvidence === true}
              onChange={(e) => set('hasEvidence', e.target.checked ? true : undefined)}
            />
            Ada bukti dukung
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.hasEvidenceLink === true}
              onChange={(e) => set('hasEvidenceLink', e.target.checked ? true : undefined)}
            />
            Ada Link Bukti Dukung
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.countsTowardSkp === true}
              onChange={(e) => set('countsTowardSkp', e.target.checked ? true : undefined)}
            />
            Masuk capaian SKP
          </label>
        </div>

        <Button type="button" size="sm" variant="ghost" onClick={() => onChange({})}>
          Hapus semua
        </Button>
      </PopoverContent>
    </Popover>
  );
}
