import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthView } from '@/features/calendar/MonthView';
import type { Activity } from '@/types';
import type { WorkdayConfig } from '@/lib/date/workdays';

const config: WorkdayConfig = { workdays: [1, 2, 3, 4, 5], holidays: [] };

function activity(date: string, overrides: Partial<Activity> = {}): Activity {
  return {
    id: `a-${date}-${overrides.status ?? 'x'}`,
    date,
    startTime: null,
    endTime: null,
    useTime: false,
    description: 'Kegiatan uji',
    achievement: 'Capaian uji',
    quantity: 1,
    unit: 'kegiatan',
    progress: 100,
    performancePlanId: 'rk-1',
    countsTowardSkp: true,
    evidenceLink: 'https://drive.google.com/x',
    evidenceCount: 1,
    status: 'complete',
    tags: [],
    rbAreas: [],
    skpPeriod: date.slice(0, 7),
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...overrides,
  } as Activity;
}

/** Kotak tanggal diambil lewat aria-label-nya, yang selalu diawali tanggalnya. */
function cell(date: string): HTMLElement {
  const el = screen.getByLabelText(new RegExp(`^${date}:`));
  return el;
}

describe('MonthView — warna kotak tanggal', () => {
  it('memberi latar navy pada tanggal yang sudah ada kegiatannya', () => {
    render(
      <MonthView
        year={2026}
        month={8}
        activities={[activity('2026-08-05')]}
        config={config}
        selectedDate={null}
        onSelectDate={() => {}}
      />
    );

    expect(cell('2026-08-05').className).toContain('bg-calendar-filled');
    expect(cell('2026-08-06').className).not.toContain('bg-calendar-filled');
  });

  it('mengalahkan latar akhir pekan, supaya Sabtu yang terisi tetap terlihat terisi', () => {
    // 1 Agustus 2026 jatuh hari Sabtu — bukan hari kerja menurut config di atas.
    render(
      <MonthView
        year={2026}
        month={8}
        activities={[activity('2026-08-01')]}
        config={config}
        selectedDate={null}
        onSelectDate={() => {}}
      />
    );

    const saturday = cell('2026-08-01');
    expect(saturday.className).toContain('bg-calendar-filled');
    expect(saturday.className).not.toContain('bg-muted/40');
  });

  it('tidak menghitung kegiatan yang sudah diarsipkan', () => {
    // Sama seperti titik penandanya: arsip tidak menandai hari sebagai terisi.
    render(
      <MonthView
        year={2026}
        month={8}
        activities={[activity('2026-08-05', { status: 'archived' })]}
        config={config}
        selectedDate={null}
        onSelectDate={() => {}}
      />
    );

    expect(cell('2026-08-05').className).not.toContain('bg-calendar-filled');
  });

  it('memakai palet titik terang, bukan warna status yang hilang di atas navy', () => {
    const { container } = render(
      <MonthView
        year={2026}
        month={8}
        activities={[activity('2026-08-05')]}
        config={config}
        selectedDate={null}
        onSelectDate={() => {}}
      />
    );

    const dot = container.querySelector('.rounded-full');
    expect(dot?.className).toContain('bg-calendar-dot-complete');
    expect(dot?.className).not.toContain('bg-success');
  });
});
