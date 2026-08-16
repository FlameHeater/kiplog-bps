import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { activityRepository } from '@/db/repositories';
import { duplicateActivityToRange } from '@/lib/services/duplicate-activity';
import type { Activity, AppSettings } from '@/types';

interface DuplicateRangeDialogProps {
  activity: Activity | null;
  settings: AppSettings | undefined;
  onOpenChange: (open: boolean) => void;
}

// FR-ACT-12.
export function DuplicateRangeDialog({ activity, settings, onOpenChange }: DuplicateRangeDialogProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [skipNonWorkdays, setSkipNonWorkdays] = useState(true);
  const [preview, setPreview] = useState<string[] | null>(null);

  function computePreview() {
    if (!activity || !settings || !startDate || !endDate) return;
    const copies = duplicateActivityToRange(activity, settings, startDate, endDate, skipNonWorkdays);
    setPreview(copies.map((c) => c.date));
  }

  async function confirm() {
    if (!activity || !settings || !startDate || !endDate) return;
    const copies = duplicateActivityToRange(activity, settings, startDate, endDate, skipNonWorkdays);
    if (copies.length > 0) await activityRepository.bulkAdd(copies);
    onOpenChange(false);
    setPreview(null);
    setStartDate('');
    setEndDate('');
  }

  return (
    <Dialog open={activity !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplikat ke Rentang Tanggal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="range-start">Dari</Label>
              <Input
                id="range-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreview(null);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="range-end">Sampai</Label>
              <Input
                id="range-end"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreview(null);
                }}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={skipNonWorkdays}
              onChange={(e) => {
                setSkipNonWorkdays(e.target.checked);
                setPreview(null);
              }}
            />
            Lewati weekend/hari libur
          </label>

          {preview ? (
            <p className="text-xs text-muted-foreground">
              {preview.length} kegiatan akan dibuat: {preview.join(', ')}
            </p>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={computePreview} disabled={!startDate || !endDate}>
              Pratinjau
            </Button>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" disabled={!preview || preview.length === 0} onClick={() => void confirm()}>
              Buat {preview?.length ?? ''} Kegiatan
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
