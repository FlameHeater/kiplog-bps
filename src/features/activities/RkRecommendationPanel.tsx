import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { recommendPerformancePlans } from '@/lib/matching/rk-matcher';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';
import { useActivities } from '@/hooks/useActivities';

const MIN_DESCRIPTION_LENGTH = 10;

interface RkRecommendationPanelProps {
  description: string;
  year: number;
  tags: string[];
  onSelect: (planId: string) => void;
  onSearchMore: () => void;
}

// FR-SRK-01..07: never auto-assigns — every result requires an explicit
// "Pilih" click. MVP, no LLM (§12.1 deterministic scoring only).
export function RkRecommendationPanel({
  description,
  year,
  tags,
  onSelect,
  onSearchMore,
}: RkRecommendationPanelProps) {
  const plans = usePerformancePlans();
  const activities = useActivities();

  const results = useMemo(() => {
    if (description.trim().length < MIN_DESCRIPTION_LENGTH || !plans) return [];
    return recommendPerformancePlans(description, plans, year, {
      activityTags: tags,
      recentActivities: activities ?? [],
    });
  }, [description, year, tags, plans, activities]);

  if (description.trim().length < MIN_DESCRIPTION_LENGTH) return null;

  return (
    <div className="rounded-control border border-border bg-muted/30 p-2">
      {results.length === 0 ? (
        <p className="text-xs text-muted-foreground">Tidak ada rekomendasi yang cukup meyakinkan.</p>
      ) : (
        <ul className="space-y-1.5">
          {results.map((r) => (
            <li key={r.plan.id} className="flex items-start justify-between gap-2 text-xs">
              <div className="min-w-0">
                <p className="line-clamp-2 font-medium">{r.plan.displayName ?? r.plan.name}</p>
                {r.plan.parentPlanName ? (
                  <p className="text-[10px] text-muted-foreground">
                    {r.plan.parentPlanName}
                    {r.plan.teamName ? ` — ${r.plan.teamName}` : ''}
                  </p>
                ) : null}
                <p className="text-[10px] text-muted-foreground">
                  {r.score}% {r.reason.length > 0 ? `· cocok dengan ${r.reason.join('; ')}` : ''}
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => onSelect(r.plan.id)}>
                Pilih
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" size="sm" variant="ghost" className="mt-1.5" onClick={onSearchMore}>
        <Search className="h-3.5 w-3.5" />
        Cari lainnya
      </Button>
    </div>
  );
}
