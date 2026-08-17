import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';
import {
  refreshSeedKeywords,
  seedPerformancePlansIfEmpty,
} from '@/lib/services/seed-performance-plans';
import { KeywordEditor } from '@/features/performance-plans/KeywordEditor';
import type { PerformancePlan } from '@/types';

function groupByTeam(plans: PerformancePlan[]): Map<string, PerformancePlan[]> {
  const groups = new Map<string, PerformancePlan[]>();
  for (const plan of plans) {
    const key = plan.teamName ?? 'Tanpa Tim';
    const group = groups.get(key) ?? [];
    group.push(plan);
    groups.set(key, group);
  }
  return groups;
}

// Fase 1 scope: read-only list grouped per tim kerja (DoD Fase 1). Full CRUD
// + CSV/JSON import (FR-DAT-03..05) is a later-phase addition — logged in
// docs/ASSUMPTIONS.md so it isn't silently dropped.
export function RencanaKinerjaPage() {
  const plans = usePerformancePlans();
  const [refreshState, setRefreshState] = useState<'idle' | 'working' | string>('idle');

  async function handleRefreshKeywords() {
    setRefreshState('working');
    const { plansUpdated, keywordsAdded } = await refreshSeedKeywords();
    setRefreshState(
      keywordsAdded === 0
        ? 'Kata kunci bawaan sudah lengkap — tidak ada yang perlu ditambahkan.'
        : `${keywordsAdded} kata kunci baru ditambahkan ke ${plansUpdated} RK.`
    );
  }

  if (plans === undefined) {
    return null;
  }

  if (plans.length === 0) {
    return (
      <div>
        <PageHeader title="Rencana Kinerja" />
        <EmptyState
          title="Belum ada Rencana Kinerja."
          action={
            <Button onClick={() => void seedPerformancePlansIfEmpty()}>Muat 40 RK 2026</Button>
          }
        />
      </div>
    );
  }

  const groups = groupByTeam(plans);

  return (
    <div>
      <PageHeader
        title="Rencana Kinerja"
        description={`${plans.length} RK aktif di ${groups.size} tim kerja — tahun ${plans[0]?.year}`}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refreshState === 'working'}
            onClick={() => void handleRefreshKeywords()}
          >
            <RefreshCw className="h-4 w-4" />
            {refreshState === 'working' ? 'Memperbarui…' : 'Perbarui kata kunci bawaan'}
          </Button>
        }
      />
      {refreshState !== 'idle' && refreshState !== 'working' ? (
        <p className="mb-4 rounded-control border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          {refreshState} Kata kunci yang Anda tambahkan sendiri tidak diubah.
        </p>
      ) : null}
      <div className="space-y-6">
        {Array.from(groups.entries()).map(([teamName, teamPlans]) => (
          <section key={teamName}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              {teamName} <span className="font-normal">({teamPlans.length})</span>
            </h2>
            <ul className="space-y-2">
              {teamPlans
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((plan) => (
                  <li
                    key={plan.id}
                    className="rounded-card border border-border bg-card p-4"
                    style={{ borderLeftColor: plan.color, borderLeftWidth: 4 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{plan.name}</p>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {plan.type}
                      </span>
                    </div>
                    {plan.parentPlanName ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        RK Atasan: {plan.parentPlanName}
                      </p>
                    ) : null}
                    <KeywordEditor plan={plan} />
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
