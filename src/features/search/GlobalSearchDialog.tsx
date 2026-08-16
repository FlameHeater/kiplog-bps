import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { searchAll, type SearchResult } from '@/lib/services/global-search';
import { useActivities } from '@/hooks/useActivities';
import { useAllEvidence } from '@/hooks/useAllEvidence';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useActivityModalStore } from '@/features/activities/activity-modal-store';
import { NoSearchResults } from '@/components/illustrations/NoSearchResults';

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Highlighted({ text, start, length }: { text: string; start: number; length: number }) {
  if (start < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, start)}
      <mark className="bg-warning/40 text-inherit">{text.slice(start, start + length)}</mark>
      {text.slice(start + length)}
    </>
  );
}

// FR-SCH-01..03: Ctrl/Cmd+K, 200ms debounce, grouped by type, keyboard nav.
export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 200);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activities = useActivities();
  const evidence = useAllEvidence();
  const plans = usePerformancePlans();
  const openEdit = useActivityModalStore((s) => s.openEdit);
  const navigate = useNavigate();

  const results = useMemo(
    () => searchAll(debouncedQuery, activities ?? [], evidence, plans ?? []),
    [debouncedQuery, activities, evidence, plans]
  );

  useEffect(() => setSelectedIndex(0), [debouncedQuery]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  function openResult(result: SearchResult) {
    if (result.activityId) {
      openEdit(result.activityId);
    } else {
      navigate('/evidence-inbox');
    }
    onOpenChange(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      openResult(results[selectedIndex]);
    }
  }

  const grouped = {
    Kegiatan: results.filter((r) => r.type === 'activity'),
    'Bukti Dukung': results.filter((r) => r.type === 'evidence'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-24 translate-y-0 p-0">
        <div className="p-3">
          <Input
            autoFocus
            placeholder="Cari kegiatan, capaian, RK, tag, bukti dukung…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="max-h-96 overflow-y-auto border-t border-border p-2">
          {debouncedQuery.trim() === '' ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Ketik untuk mencari.</p>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <NoSearchResults />
              <p className="text-sm text-muted-foreground">Tidak ada hasil untuk "{debouncedQuery}".</p>
            </div>
          ) : (
            Object.entries(grouped).map(([label, items]) =>
              items.length > 0 ? (
                <div key={label} className="mb-2">
                  <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">{label}</p>
                  {items.map((item) => {
                    const globalIndex = results.indexOf(item);
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        onClick={() => openResult(item)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`block w-full rounded-control px-2 py-2 text-left text-sm ${
                          globalIndex === selectedIndex ? 'bg-accent' : ''
                        }`}
                      >
                        <p className="line-clamp-1 font-medium">{item.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          <Highlighted text={item.snippet} start={item.matchStart} length={item.matchLength} />
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : null
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
