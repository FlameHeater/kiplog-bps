import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { performancePlanRepository } from '@/db/repositories';
import type { PerformancePlan } from '@/types';

interface KeywordEditorProps {
  plan: PerformancePlan;
}

// FR-SRK — lets a user directly curate the keyword list rk-matcher.ts uses
// for auto-matching, instead of only growing it indirectly via
// applyLocalLearning when an RK gets picked during activity entry.
export function KeywordEditor({ plan }: KeywordEditorProps) {
  const [draft, setDraft] = useState('');

  async function addKeyword() {
    const value = draft.trim().toLowerCase();
    if (!value || plan.keywords.includes(value)) {
      setDraft('');
      return;
    }
    await performancePlanRepository.upsert({
      ...plan,
      keywords: [...plan.keywords, value],
      updatedAt: new Date().toISOString(),
    });
    setDraft('');
  }

  async function removeKeyword(keyword: string) {
    await performancePlanRepository.upsert({
      ...plan,
      keywords: plan.keywords.filter((k) => k !== keyword),
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="mt-2 space-y-1.5">
      {plan.keywords.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {plan.keywords.map((keyword) => (
            <span
              key={keyword}
              className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {keyword}
              <button
                type="button"
                aria-label={`Hapus kata kunci ${keyword}`}
                onClick={() => void removeKeyword(keyword)}
                className="rounded-full hover:text-destructive"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Belum ada kata kunci.</p>
      )}
      <div className="flex gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void addKeyword();
            }
          }}
          placeholder="Tambah kata kunci…"
          className="h-7 text-xs"
        />
        <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => void addKeyword()}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
