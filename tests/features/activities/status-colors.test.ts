import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_STATUS_LABELS,
  STATUS_BADGE_CLASS,
  STATUS_CARD_CLASS,
} from '@/features/activities/activity-status-labels';
import type { ActivityStatus } from '@/types';

/** Warna dasar tiap status, persis seperti yang ditetapkan pemilik proyek. */
const SPEC: Record<ActivityStatus, { label: string; token: string }> = {
  draft: { label: 'Draft', token: 'status-draft' },
  complete: { label: 'Lengkap', token: 'status-complete' },
  ready_to_report: { label: 'Siap Lapor', token: 'status-ready' },
  reported: { label: 'Sudah Dilaporkan', token: 'status-reported' },
  archived: { label: 'Diarsipkan', token: 'status-archived' },
};

describe('warna status kegiatan', () => {
  it.each(Object.entries(SPEC) as [ActivityStatus, (typeof SPEC)[ActivityStatus]][])(
    '%s memakai token warnanya sendiri di badge dan kartu',
    (status, spec) => {
      expect(STATUS_BADGE_CLASS[status]).toContain(`text-${spec.token}`);
      expect(STATUS_CARD_CLASS[status]).toContain(`border-l-${spec.token}`);
      expect(ACTIVITY_STATUS_LABELS[status]).toBe(spec.label);
    }
  );

  it('tidak ada dua status yang memakai warna sama', () => {
    // Kalau dua status berbagi warna, daftar panjang jadi tidak terbaca sekilas
    // — dan itu justru tujuan pewarnaan ini.
    const tokens = Object.values(SPEC).map((s) => s.token);
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it('menyisakan arsip tetap diredupkan', () => {
    expect(STATUS_CARD_CLASS.archived).toContain('opacity-75');
  });
});

describe('token warna status di theme.css', () => {
  const css = readFileSync('src/styles/theme.css', 'utf-8');

  it.each(Object.values(SPEC).map((s) => s.token))(
    '%s punya nilai untuk mode terang DAN mode gelap',
    (token) => {
      // Token yang hanya didefinisikan sekali akan membuat salah satu mode
      // kehilangan warnanya sama sekali.
      const matches = css.match(new RegExp(`--${token}:`, 'g')) ?? [];
      expect(matches.length).toBe(2);
    }
  );

  it('mendaftarkan seluruh token status di tailwind.config.js', () => {
    // Kelas seperti `text-status-draft` tidak akan menghasilkan CSS apa pun
    // kalau namanya tidak terdaftar — dan kegagalan itu tidak terlihat sampai
    // dibuka di browser.
    const config = readFileSync('tailwind.config.js', 'utf-8');
    for (const { token } of Object.values(SPEC)) {
      expect(config).toContain(`'${token}': 'hsl(var(--${token}))'`);
    }
  });
});
