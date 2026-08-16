import { describe, expect, it } from 'vitest';
import { generateAchievementSuggestions } from '@/lib/matching/achievement-generator';

describe('generateAchievementSuggestions', () => {
  it('matches the real Data Dukung example verbatim (§13.1 fixture)', () => {
    const [first] = generateAchievementSuggestions(
      'Melakukan Input Petugas SNLIK 2026 di Website Provinsi',
      100
    );
    expect(first?.text).toBe('Terselesaikannya Melakukan Input Petugas SNLIK 2026 di Website Provinsi');
    expect(first?.isDefault).toBe(true);
  });

  it('offers a pattern-based alternate that drops the leading verb', () => {
    const suggestions = generateAchievementSuggestions('Menyusun laporan akhir kegiatan', 100);
    expect(suggestions.map((s) => s.text)).toContain('Tersusunnya laporan akhir kegiatan');
  });

  it('never claims completion when progress < 100', () => {
    const suggestions = generateAchievementSuggestions('Menyusun laporan akhir', 50);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.text).toBe('Terlaksananya sebagian Menyusun laporan akhir (progress 50%)');
    expect(suggestions[0]?.text).not.toMatch(/Terselesaikannya|Tersusunnya/);
  });

  it('preserves known acronyms in their canonical casing', () => {
    const [first] = generateAchievementSuggestions('Melakukan monitoring listing se2026 di opd', 100);
    expect(first?.text).toContain('SE2026');
    expect(first?.text).toContain('OPD');
  });

  it('returns nothing for an empty description', () => {
    expect(generateAchievementSuggestions('   ', 100)).toEqual([]);
  });

  it('caps suggestions at 3', () => {
    const suggestions = generateAchievementSuggestions('Melakukan sesuatu', 100);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });
});
