import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { orderPlansForCombobox } from '@/lib/services/plan-ordering';
import type { PerformancePlan } from '@/types';

interface RkComboboxProps {
  value: string | null;
  onChange: (planId: string | null) => void;
  /** Lets a parent (e.g. "Cari lainnya" in the recommendation panel) open this combobox. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function PlanRow({
  plan,
  selected,
  onSelect,
}: {
  plan: PerformancePlan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-start gap-2 rounded-control px-2 py-2 text-left text-sm hover:bg-accent"
    >
      <span
        className="mt-1 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: plan.color }}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block" title={plan.name}>
          {plan.displayName ?? plan.name}
        </span>
        {plan.parentPlanName ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {plan.parentPlanName}
            {plan.teamName ? ` — ${plan.teamName}` : ''}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
        {plan.type}
      </span>
      {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
    </button>
  );
}

// FR-RKS-01..07: searchable combobox (never a bare <select> for 40 items),
// default grouping Favorit → Baru digunakan → Sering digunakan → per tim,
// fuzzy search once typing starts, and a parentPlanName+team disambiguator
// on every row (cheapest way to satisfy FR-RKS-07 without tracking which
// specific CONFUSABLE_PLAN_GROUPS member is showing).
export function RkCombobox({ value, onChange, open: openProp, onOpenChange }: RkComboboxProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 200);
  const allPlans = usePerformancePlans();

  const activePlans = useMemo(() => (allPlans ?? []).filter((p) => p.isActive), [allPlans]);
  const selectedPlan = useMemo(
    () => (allPlans ?? []).find((p) => p.id === value) ?? null,
    [allPlans, value]
  );

  const fuse = useMemo(
    () =>
      new Fuse(activePlans, {
        keys: ['name', 'displayName', 'keywords', 'tags'],
        threshold: 0.35,
      }),
    [activePlans]
  );

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return null;
    return fuse.search(debouncedQuery).map((r) => r.item);
  }, [fuse, debouncedQuery]);

  const ordered = useMemo(() => orderPlansForCombobox(activePlans), [activePlans]);

  function handleSelect(planId: string) {
    onChange(planId);
    setOpen(false);
    setQuery('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
          aria-label="Pilih Rencana Kinerja"
        >
          <span className="truncate">
            {selectedPlan
              ? selectedPlan.displayName ?? selectedPlan.name
              : 'Pilih Rencana Kinerja…'}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-2">
        <Input
          autoFocus
          placeholder="Cari Rencana Kinerja…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2"
        />
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {searchResults ? (
            searchResults.length > 0 ? (
              searchResults.map((plan) => (
                <PlanRow
                  key={plan.id}
                  plan={plan}
                  selected={plan.id === value}
                  onSelect={() => handleSelect(plan.id)}
                />
              ))
            ) : (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                Tidak ada RK yang cocok.
              </p>
            )
          ) : (
            <>
              {ordered.favorites.length > 0 ? (
                <section>
                  <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">Favorit</p>
                  {ordered.favorites.map((plan) => (
                    <PlanRow key={plan.id} plan={plan} selected={plan.id === value} onSelect={() => handleSelect(plan.id)} />
                  ))}
                </section>
              ) : null}
              {ordered.recent.length > 0 ? (
                <section>
                  <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">Baru digunakan</p>
                  {ordered.recent.map((plan) => (
                    <PlanRow key={plan.id} plan={plan} selected={plan.id === value} onSelect={() => handleSelect(plan.id)} />
                  ))}
                </section>
              ) : null}
              {ordered.frequent.length > 0 ? (
                <section>
                  <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">Sering digunakan</p>
                  {ordered.frequent.map((plan) => (
                    <PlanRow key={plan.id} plan={plan} selected={plan.id === value} onSelect={() => handleSelect(plan.id)} />
                  ))}
                </section>
              ) : null}
              {Array.from(ordered.byTeam.entries()).map(([team, plans]) => (
                <section key={team}>
                  <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">{team}</p>
                  {plans.map((plan) => (
                    <PlanRow key={plan.id} plan={plan} selected={plan.id === value} onSelect={() => handleSelect(plan.id)} />
                  ))}
                </section>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
