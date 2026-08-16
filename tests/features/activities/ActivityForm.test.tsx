import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActivityForm } from '@/features/activities/ActivityForm';
import { db } from '@/db/database';
import { activityRepository } from '@/db/repositories';
import type { Activity, AppSettings } from '@/types';

const settings: AppSettings = {
  id: 'settings',
  workdays: [1, 2, 3, 4, 5],
  holidays: [],
  requireEvidenceForReady: true,
  requireEvidenceLinkForReady: true,
  defaultStartTime: '08:00',
  defaultEndTime: '16:00',
  defaultCountsTowardSkp: true,
  theme: 'system',
  maxFileSizeMb: 10,
  autoCompressImages: true,
  monthEndReminderDays: 5,
  lastBackupAt: null,
  schemaVersion: 1,
};

afterEach(async () => {
  await db.activities.clear();
  vi.useRealTimers();
});

// Regression test for the autosave-clobbers-evidenceCount bug found during
// Fase 3 manual verification: autosave used to rebuild the Activity record
// from form values + a near-empty fallback object, discarding whatever
// evidenceCount/evidenceLinkStatus the Evidence Gallery had set in the DB
// in between debounce ticks.
describe('ActivityForm autosave (§9.6 regression)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('never regresses evidenceCount set out-of-band while the form is open', async () => {
    render(
      <ActivityForm
        existing={null}
        prefillDate="2026-08-16"
        settings={settings}
        onSaved={() => {}}
        onCancel={() => {}}
      />
    );

    fireEvent.input(screen.getByLabelText(/Deskripsi kegiatan/), {
      target: { value: 'Uji autosave' },
    });

    await vi.advanceTimersByTimeAsync(2100);

    const rows = await db.activities.toArray();
    expect(rows).toHaveLength(1);
    const draftId = rows[0]!.id;

    // Simulate the Evidence Gallery syncing evidenceCount independently,
    // the way evidenceRepository.addForActivity does.
    await db.activities.update(draftId, { evidenceCount: 3, evidenceLinkStatus: 'collected' });

    // A second form edit should trigger another autosave tick.
    fireEvent.input(screen.getByLabelText(/Capaian hasil kegiatan/), {
      target: { value: 'Terselesaikannya uji autosave' },
    });
    await vi.advanceTimersByTimeAsync(2100);

    await waitFor(async () => {
      const updated = await activityRepository.get(draftId);
      expect(updated?.evidenceCount).toBe(3);
      expect(updated?.evidenceLinkStatus).toBe('collected');
    });
  });

  // Regression test for a real data-corruption bug: editing an existing
  // activity without touching any field used to still fire autosave 2s
  // after mount (the old guard only skipped brand-new/untouched activities,
  // never an untouched EDIT), so if the form ever rendered with wrong
  // defaultValues even once — e.g. during a remount race — that wrong data
  // would get written straight over the real record.
  it('never autosaves an existing activity that the user has not touched', async () => {
    const existing: Activity = {
      id: 'existing-1',
      date: '2026-06-30',
      startTime: '07:24',
      endTime: '20:45',
      description: 'Persiapan administrasi Rapat PPL dan PML di Desa Tejakula',
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
    await db.activities.put(existing);

    render(
      <ActivityForm
        existing={existing}
        prefillDate={null}
        settings={settings}
        onSaved={() => {}}
        onCancel={() => {}}
      />
    );

    // No user interaction at all — just mounted and sat open.
    await vi.advanceTimersByTimeAsync(2100);

    const row = await activityRepository.get('existing-1');
    expect(row?.date).toBe('2026-06-30');
    expect(row?.startTime).toBe('07:24');
    expect(row?.description).toBe('Persiapan administrasi Rapat PPL dan PML di Desa Tejakula');
  });
});
