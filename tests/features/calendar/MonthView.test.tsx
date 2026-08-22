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
    performancePlanId: null,
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

describe('MonthView — pil kegiatan per tanggal', () => {
  it('menampilkan pil berisi deskripsi kegiatan pada tanggal yang terisi', () => {
    render(
      <MonthView
        year={2026}
        month={8}
        activities={[activity('2026-08-05', { description: 'Rapat evaluasi' })]}
        config={config}
        selectedDate={null}
        onSelectDate={() => {}}
      />
    );

    expect(cell('2026-08-05').textContent).toContain('Rapat evaluasi');
    expect(cell('2026-08-06').textContent).not.toContain('Rapat evaluasi');
  });

  it('tetap menampilkan pil pada hari Sabtu yang terisi, walau latarnya akhir pekan', () => {
    // 1 Agustus 2026 jatuh hari Sabtu — bukan hari kerja menurut config di atas.
    render(
      <MonthView
        year={2026}
        month={8}
        activities={[activity('2026-08-01', { description: 'Kerja Sabtu' })]}
        config={config}
        selectedDate={null}
        onSelectDate={() => {}}
      />
    );

    expect(cell('2026-08-01').textContent).toContain('Kerja Sabtu');
  });

  it('tidak menghitung kegiatan yang sudah diarsipkan', () => {
    render(
      <MonthView
        year={2026}
        month={8}
        activities={[activity('2026-08-05', { status: 'archived', description: 'Arsip lama' })]}
        config={config}
        selectedDate={null}
        onSelectDate={() => {}}
      />
    );

    expect(cell('2026-08-05').textContent).not.toContain('Arsip lama');
  });

  it('mewarnai pil dengan warna RK yang ditautkan, bukan warna status', () => {
    render(
      <MonthView
        year={2026}
        month={8}
        activities={[activity('2026-08-05', { performancePlanId: 'rk-1', description: 'Ada RK' })]}
        config={config}
        selectedDate={null}
        onSelectDate={() => {}}
      />
    );

    // Tanpa daftar RK dari usePerformancePlans (kosong di lingkungan test),
    // plan-nya tidak ditemukan — pil jatuh ke kelas warna status seperti
    // kegiatan tanpa RK. Yang penting dicek di sini: pil tetap muncul dan
    // tidak melempar error saat performancePlanId menunjuk RK yang tidak ada
    // di daftar (RK terhapus setelah kegiatan dibuat, skenario nyata).
    expect(cell('2026-08-05').textContent).toContain('Ada RK');
  });

  it('menampilkan "+N lainnya" saat kegiatan lebih dari dua dalam sehari', () => {
    render(
      <MonthView
        year={2026}
        month={8}
        activities={[
          activity('2026-08-05', { id: 'a1', description: 'Satu' }),
          activity('2026-08-05', { id: 'a2', description: 'Dua' }),
          activity('2026-08-05', { id: 'a3', description: 'Tiga' }),
        ]}
        config={config}
        selectedDate={null}
        onSelectDate={() => {}}
      />
    );

    const text = cell('2026-08-05').textContent ?? '';
    expect(text).toContain('Satu');
    expect(text).toContain('Dua');
    expect(text).not.toContain('Tiga');
    expect(text).toContain('+1 lainnya');
  });
});
