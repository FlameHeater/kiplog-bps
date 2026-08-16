import { describe, it, expect } from 'vitest';
import { parseActivityRows, buildDraftActivities } from '@/lib/services/pdf-activity-import';

// Sample mimics pdfjs's ACTUAL raw text extraction from the real source PDF
// (verified against the real file in the browser): the date column wraps
// with spaced hyphens ("2026 - \n04 - 01 "), coordinates get a space after
// their leading minus ("- 8.1150213,"), and "Buat kehadiran/Presensi" rows
// are check-in/out noise, not real activities.
const SAMPLE_TEXT = `
Rincian Aktivitas
Nama : undefined
NIP : undefined
Periode : 01 April s.d. 30 Juni 2026
Tanggal Waktu Deskripsi Koordinat
2026 -
04 - 01
07:26 Buat kehadiran/Presensi - 8.1150213,
115.0862976
16:36 Menyimak Rilis BRS Provinsi Bali; Melakukan Editing Video GC SE2026 di
Pasar Anyar; Rapat Internal Desa Cantik 2026; Rapat Internal Indeks
Pelayanan Publik (IPP)
- 8.1150981,
115.0867665
16:37 Buat kehadiran/Presensi - 8.1150948,
115.0867926
2026 -
04 - 02
07:25 Buat kehadiran/Presensi - 8.1150679,
115.0866741
16:06 Dokumentasi Upacara Piodalan di BPS Kabupaten Buleleng; Halal bi Halal di
BPS Kabupaten Buleleng
- 8.1151329,
115.0867424
16:06 Buat kehadiran/Presensi - 8.1150694,
115.0867079
`;

describe('parseActivityRows', () => {
  it('extracts date/time/description rows despite wrapped dates and multiline descriptions', () => {
    const rows = parseActivityRows(SAMPLE_TEXT);
    expect(rows).toHaveLength(6);
    expect(rows[0]).toMatchObject({ date: '2026-04-01', time: '07:26', isPresence: true });
    expect(rows[1]).toMatchObject({
      date: '2026-04-01',
      time: '16:36',
      isPresence: false,
    });
    expect(rows[1]!.description).toContain('Menyimak Rilis BRS Provinsi Bali');
    expect(rows[1]!.description).toContain('Rapat Internal Indeks Pelayanan Publik (IPP)');
    expect(rows[3]).toMatchObject({ date: '2026-04-02', time: '07:25', isPresence: true });
  });
});

describe('buildDraftActivities', () => {
  it('drops presence rows, splits multi-item descriptions, and windows time from check-in to log time', () => {
    const rows = parseActivityRows(SAMPLE_TEXT);
    const drafts = buildDraftActivities(rows);

    expect(drafts).toHaveLength(4 + 2); // 4 items in day 1's row + 2 in day 2's row
    expect(drafts.every((d) => d.startTime < d.endTime)).toBe(true);

    const day1 = drafts.filter((d) => d.date === '2026-04-01');
    expect(day1).toHaveLength(4);
    expect(day1[0]).toEqual({
      date: '2026-04-01',
      startTime: '07:26',
      endTime: '16:36',
      description: 'Menyimak Rilis BRS Provinsi Bali',
    });
    expect(day1[3]!.description).toBe('Rapat Internal Indeks Pelayanan Publik (IPP)');

    // pdfjs also spaces out hyphens inside compound words; buildDraftActivities
    // undoes that in the description text.
    const hyphenRow = parseActivityRows(
      '2026 -\n04 - 07\n07:22 Buat kehadiran/Presensi - 8.1150492, 115.0869139\n17:47 Rapat Persiapan se - Provinsi Bali - 8.1150897, 115.0867692'
    );
    const hyphenDrafts = buildDraftActivities(hyphenRow);
    expect(hyphenDrafts[0]!.description).toBe('Rapat Persiapan se-Provinsi Bali');

    const day2 = drafts.filter((d) => d.date === '2026-04-02');
    expect(day2).toHaveLength(2);
    expect(day2[0]).toEqual({
      date: '2026-04-02',
      startTime: '07:25',
      endTime: '16:06',
      description: 'Dokumentasi Upacara Piodalan di BPS Kabupaten Buleleng',
    });
  });
});
