import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { activityRepository } from '@/db/repositories';
import type { Activity } from '@/types';

interface DeleteActivityDialogProps {
  activity: Activity | null;
  evidenceCount: number;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

// FR-ACT-10, §9.6, §17.1/§17.2: hapus kegiatan wajib menyebut jumlah
// evidence dan menawarkan pilihan hapus-sekaligus vs kembalikan ke Inbox.
export function DeleteActivityDialog({
  activity,
  evidenceCount,
  onOpenChange,
  onDeleted,
}: DeleteActivityDialogProps) {
  if (!activity) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  async function handle(action: 'delete' | 'unassign' | null) {
    if (action && activity) {
      await activityRepository.removeWithEvidence(activity.id, action);
      onDeleted();
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={activity !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus kegiatan?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {evidenceCount > 0
            ? `Kegiatan ini memiliki ${evidenceCount} bukti dukung. Hapus sekaligus, atau kembalikan bukti ke Evidence Inbox?`
            : 'Kegiatan ini akan dihapus permanen.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {evidenceCount > 0 ? (
            <>
              <Button variant="destructive" onClick={() => void handle('delete')}>
                Hapus sekaligus
              </Button>
              <Button variant="outline" onClick={() => void handle('unassign')}>
                Kembalikan bukti ke Inbox
              </Button>
            </>
          ) : (
            <Button variant="destructive" onClick={() => void handle('delete')}>
              Hapus
            </Button>
          )}
          <Button variant="ghost" onClick={() => void handle(null)}>
            Batal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
