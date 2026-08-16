import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ActivityFormModal } from '@/features/activities/ActivityFormModal';
import { useActivityModalStore } from '@/features/activities/activity-modal-store';
import { db } from '@/db/database';
import type { Activity } from '@/types';

afterEach(async () => {
  await db.activities.clear();
  useActivityModalStore.getState().close();
});

function makeActivity(id: string, description: string): Activity {
  return {
    id,
    date: '2026-06-30',
    startTime: '07:24',
    endTime: '20:45',
    description,
    progress: 100,
    achievement: '',
    evidenceLink: null,
    countsTowardSkp: true,
    year: 2026,
    skpPeriod: '2026-06',
    performancePlanId: null,
    durationMinutes: 801,
    status: 'draft',
    evidenceLinkStatus: 'none',
    tags: [],
    rbAreas: [],
    evidenceCount: 0,
    reportedAt: null,
    sentForReview: false,
    templateId: null,
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z',
  };
}

// Regression test for a real data-loss bug: useActivity's live query doesn't
// reset to `undefined` the instant `editingId` changes — closing the modal
// drives it through `id=null` (existing=null), and reopening the SAME
// activity briefly kept showing that stale `null` while `editingId` had
// already flipped back to the real id. The modal's old loading gate
// (`existing === undefined`) missed this, so the form mounted with
// existing=null and silently rendered as a blank "new activity" form under
// the "Ubah Kegiatan" title — indistinguishable from the real thing until
// you looked at the actual field values.
describe('ActivityFormModal (edit-reopen regression)', () => {
  it('shows the real activity data on reopen, never falling back to a blank new-activity form', async () => {
    const activity = makeActivity('activity-1', 'Rapat Evaluasi PPL dan PML');
    await db.activities.put(activity);

    render(<ActivityFormModal />);

    act(() => useActivityModalStore.getState().openEdit('activity-1'));
    await waitFor(() => {
      expect(screen.getByLabelText(/Deskripsi kegiatan/)).toHaveValue('Rapat Evaluasi PPL dan PML');
    });

    act(() => useActivityModalStore.getState().close());
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    act(() => useActivityModalStore.getState().openEdit('activity-1'));
    await waitFor(() => {
      expect(screen.getByLabelText(/Deskripsi kegiatan/)).toHaveValue('Rapat Evaluasi PPL dan PML');
    });
    // Never observably blank at any point after the dialog re-renders.
    expect(screen.getByLabelText(/Deskripsi kegiatan/)).not.toHaveValue('');
  });
});
