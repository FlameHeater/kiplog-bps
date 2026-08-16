import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActivityModalStore } from './activity-modal-store';
import { useActivity } from '@/hooks/useActivity';
import { useSettings } from '@/hooks/useSettings';
import { useSkpPeriod } from '@/hooks/useSkpPeriod';
import { ActivityForm } from './ActivityForm';

// §17.1 — two distinct lock reasons need two distinct explanations.
const SENT_FOR_REVIEW_MESSAGE =
  'Kegiatan ini sudah dikirim untuk dinilai. Di KipApp, data yang sudah dikirim tidak dapat diedit.';
const PERIOD_LOCKED_MESSAGE =
  'Periode SKP ini sudah Anda tandai terkunci. Buka kunci di halaman KipApp Ready jika ini keliru.';

function deriveSkpPeriod(date: string): string {
  return date.slice(0, 7);
}

// Mounted once in AppShell so "+ Tambah Kegiatan" works identically from
// the FAB, Day Panel, or the Kegiatan list (FR-ACT-01).
export function ActivityFormModal() {
  const { isOpen, editingId, prefillDate, close } = useActivityModalStore();
  const existing = useActivity(editingId);
  const settings = useSettings();

  const relevantDate = existing?.date ?? prefillDate ?? new Date().toISOString().slice(0, 10);
  const skpPeriod = useSkpPeriod(deriveSkpPeriod(relevantDate));

  // useActivity's live query doesn't reset to `undefined` the instant
  // `editingId` changes — closing the modal drives it to `null` (id=null),
  // and reopening the SAME activity briefly keeps showing that stale
  // `null` (not yet re-resolved) while `editingId` has already flipped
  // back to the real id. Gating on `existing === undefined` alone missed
  // this: `loading` went false one render too early, so ActivityForm
  // mounted with `existing=null` and silently fell back to a blank
  // "new activity" form for what the title still correctly called "Ubah
  // Kegiatan". Require existing.id to actually match editingId before
  // treating the query as settled.
  // useActivity's live query doesn't reset to `undefined` the instant
  // `editingId` changes — closing the modal drives it to `null` (id=null),
  // and reopening the SAME activity briefly keeps showing that stale
  // `null` (not yet re-resolved) while `editingId` has already flipped
  // back to the real id. Gating on `existing === undefined` alone missed
  // this: `loading` went false one render too early, so ActivityForm
  // mounted with `existing=null` and silently fell back to a blank
  // "new activity" form for what the title still correctly called "Ubah
  // Kegiatan". Require existing.id to actually match editingId before
  // treating the query as settled.
  const loading =
    (editingId !== null && (existing === undefined || existing === null || existing.id !== editingId)) ||
    skpPeriod === undefined;

  // §9.4: sentForReview locks regardless of period state; a locked
  // SkpPeriod locks every activity in that period the same way.
  const sentForReview = Boolean(existing?.sentForReview);
  const periodLocked = Boolean(skpPeriod?.isLocked);
  const readOnly = sentForReview || periodLocked;
  const readOnlyReason = sentForReview ? SENT_FOR_REVIEW_MESSAGE : periodLocked ? PERIOD_LOCKED_MESSAGE : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingId ? 'Ubah Kegiatan' : 'Tambah Kegiatan'}</DialogTitle>
        </DialogHeader>
        {loading ? null : (
          <ActivityForm
            // Force a full remount per activity: without this, opening a
            // second activity's edit form while the modal instance is
            // reused could leave react-hook-form's defaultValues/draftId
            // (captured once at first mount) pointing at the PREVIOUS
            // activity, and a stale autosave would silently overwrite the
            // new one's real data with blank/default values.
            key={editingId ?? 'new'}
            existing={existing ?? null}
            prefillDate={prefillDate}
            settings={settings ?? undefined}
            readOnly={readOnly}
            readOnlyReason={readOnlyReason}
            onSaved={close}
            onCancel={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
