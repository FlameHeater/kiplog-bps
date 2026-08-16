import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useActivities } from '@/hooks/useActivities';
import { evidenceRepository } from '@/db/repositories';

interface LinkToActivityDialogProps {
  evidenceIds: string[];
  onOpenChange: (open: boolean) => void;
  onLinked: () => void;
}

// FR-INB-04: search an activity by date/description, then link every
// selected evidence item (multi-select happens on the Inbox grid) to it.
export function LinkToActivityDialog({ evidenceIds, onOpenChange, onLinked }: LinkToActivityDialogProps) {
  const activities = useActivities();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = activities ?? [];
    if (!q) return list.slice(0, 20);
    return list.filter((a) => a.date.includes(q) || a.description.toLowerCase().includes(q)).slice(0, 20);
  }, [activities, query]);

  async function linkTo(activityId: string) {
    await Promise.all(evidenceIds.map((id) => evidenceRepository.assignToActivity(id, activityId)));
    onLinked();
  }

  return (
    <Dialog open={evidenceIds.length > 0} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tautkan {evidenceIds.length} bukti ke kegiatan</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Cari berdasarkan tanggal atau deskripsi…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
          {results.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Tidak ada kegiatan yang cocok.</p>
          ) : (
            results.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => void linkTo(activity.id)}
                className="flex w-full flex-col items-start rounded-control px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="font-medium">{activity.date}</span>
                <span className="line-clamp-1 text-xs text-muted-foreground">{activity.description || '(tanpa deskripsi)'}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
