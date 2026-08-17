import { describe, expect, it } from 'vitest';
import { applyLocalLearning, recommendPerformancePlans } from '@/lib/matching/rk-matcher';
import { toPerformancePlans } from '@/lib/services/seed-performance-plans';

const plans = toPerformancePlans();
const byNo = (no: number) => plans.find((p) => p.sortOrder === no)!;

// PRD §12.1.5 / QA-08 — these five cases are a hard requirement before
// Fase 4 can be considered done.
describe('recommendPerformancePlans — QA-08 required cases', () => {
  it('1. SNLIK description recommends RK #2 on top', () => {
    const results = recommendPerformancePlans(
      'Melakukan input petugas SNLIK 2026 di website provinsi',
      plans,
      2026
    );
    expect(results[0]?.plan.id).toBe(byNo(2).id);
  });

  it('2. SE2026 listing description recommends RK #16 on top', () => {
    const results = recommendPerformancePlans(
      'Monitoring progres listing SE2026 di Kecamatan Tejakula',
      plans,
      2026
    );
    expect(results[0]?.plan.id).toBe(byNo(16).id);
  });

  it('3. Desa Cantik description recommends RK #22 on top', () => {
    const results = recommendPerformancePlans(
      'Menyusun laporan akhir Desa Cantik Desa Tembok',
      plans,
      2026
    );
    expect(results[0]?.plan.id).toBe(byNo(22).id);
  });

  it('4. Social media posting description surfaces RK #33 and #31 side by side', () => {
    const results = recommendPerformancePlans(
      'Posting kegiatan sosialisasi SE2026 di Instagram BPS Buleleng',
      plans,
      2026
    );
    const ids = results.map((r) => r.plan.id);
    expect(ids).toContain(byNo(33).id);
    expect(ids).toContain(byNo(31).id);
  });

  it('5. A generic description ("rapat") yields no recommendation above threshold', () => {
    const results = recommendPerformancePlans('rapat', plans, 2026);
    expect(results).toHaveLength(0);
  });
});

// Kalibrasi Agustus 2026 — kasus di bawah diambil dari file cascading kinerja
// resmi dan dari log kegiatan nyata (Data Dukung April + Rincian Aktivitas
// Juli–Agustus 2026). Tiga di antaranya GAGAL pada matcher versi sebelumnya.
describe('recommendPerformancePlans — kalibrasi kosakata nyata', () => {
  it('satu kata kunci yang khas sudah cukup melewati ambang (dulu 32 < 35, selalu terbuang)', () => {
    const results = recommendPerformancePlans(
      'Pengawasan Sakernas Agustus 2026 di Tejakula',
      plans,
      2026
    );
    expect(results[0]?.plan.id).toBe(byNo(1).id);
  });

  it.each([
    ['Melakukan Pemeriksaan Dokumen Survei Harga Perdesaan (SHPed) April 2026', 5],
    ['Melakukan Pengawasan VHTL dan VHTS Bulan April 2026', 6],
    ['Melakukan Pemeriksaan IMK dan IBS', 4],
    ['Pemeriksaa SKTNP Triwulan I 2026', 7],
    ['Pemeriksaan Survei Khusus Lembaga Non Profit Triwulanan', 12],
    ['Perbaikan Anomali SE2026 di FASIH', 16],
    ['Melakukan Lapor Bangkom Pelatihan Petugas Organik di Gojags', 35],
    ['Menjadi Operator e-surat BPS Kabupaten Buleleng', 38],
    ['Pengumpulan Bukti Dukung QG Gate 3', 36],
    ['Mengikuti Zoom Internalisasi Romantik Tahun 2026', 23],
  ])('istilah lapangan "%s" mengarah ke RK #%i', (description, no) => {
    const results = recommendPerformancePlans(description, plans, 2026);
    expect(results[0]?.plan.sortOrder).toBe(no);
  });

  it('tidak lagi menukar bidang gara-gara kerangka nama RK yang sama (Harga vs Jasa)', () => {
    // Nama kedua RK ini hanya berbeda satu kata; kemiripan teks mentahnya 0.92.
    const results = recommendPerformancePlans(
      'Mengerjakan input data survei harga produsen',
      plans,
      2026
    );
    expect(results[0]?.plan.sortOrder).toBe(5);
    expect(results.map((r) => r.plan.sortOrder)).not.toContain(6);
  });

  it('memisahkan RK sebidang lewat jenis pekerjaan: rilis vs pelaksanaan Neraca Pengeluaran', () => {
    const rilis = recommendPerformancePlans(
      'Menyiapkan bahan rilis BRS neraca pengeluaran',
      plans,
      2026
    );
    expect(rilis[0]?.plan.sortOrder).toBe(9);

    const lapangan = recommendPerformancePlans(
      'Pemeriksaan dokumen SKLNPT triwulan I',
      plans,
      2026
    );
    expect(lapangan[0]?.plan.sortOrder).toBe(12);
  });

  it('kata kunci yang dipakai banyak RK tidak menentukan sendirian', () => {
    // "opd" dimiliki RK #23, #24, dan #26 — tanpa penciri lain, tak satu pun
    // boleh melewati ambang hanya karena kata itu.
    const results = recommendPerformancePlans('Berkoordinasi dengan OPD', plans, 2026);
    expect(results).toHaveLength(0);
  });

  it('abstain, bukan menebak, untuk deskripsi tanpa istilah yang dikenal', () => {
    expect(
      recommendPerformancePlans('Halal bi Halal di BPS Kabupaten Buleleng', plans, 2026)
    ).toHaveLength(0);
  });
});

describe('recommendPerformancePlans — output contract', () => {
  it('never returns more than 3 recommendations', () => {
    const results = recommendPerformancePlans('Melakukan input petugas SNLIK 2026', plans, 2026);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('every recommendation includes a non-empty reason when it matched keywords', () => {
    const results = recommendPerformancePlans('Melakukan input petugas SNLIK 2026', plans, 2026);
    expect(results[0]?.reason.length).toBeGreaterThan(0);
  });

  it('only considers active plans for the given year', () => {
    const inactive = [...plans];
    inactive[0] = { ...inactive[0]!, isActive: false };
    const results = recommendPerformancePlans('Melakukan input petugas SNLIK 2026', inactive, 2025);
    expect(results).toHaveLength(0);
  });
});

describe('applyLocalLearning (§12.1.4)', () => {
  it('adds new description tokens not already in the keyword list', () => {
    const plan = byNo(2);
    const learned = applyLocalLearning(plan, 'Verifikasi lapangan bersama enumerator baru');
    expect(learned).toEqual(expect.arrayContaining(['verifikasi', 'lapangan', 'enumerator']));
  });

  it('never duplicates an existing keyword', () => {
    const plan = byNo(2);
    const learned = applyLocalLearning(plan, 'Melakukan input petugas SNLIK 2026');
    // "snlik" is already a keyword — must appear exactly once, not re-added.
    expect(learned.filter((k) => k.toLowerCase() === 'snlik')).toHaveLength(1);
  });

  it('tidak menyimpan kata yang terlalu umum sebagai kata kunci', () => {
    // Tanpa saringan ini, "rapat" tersimpan hanya di satu RK sehingga
    // pembobotan kekhasan menganggapnya penciri kuat — kebalikan kenyataan.
    const learned = applyLocalLearning(
      byNo(2),
      'Mengikuti rapat rutin tim di kantor BPS Kabupaten Buleleng'
    );
    expect(learned).not.toContain('rapat');
    expect(learned).not.toContain('kantor');
    expect(learned).not.toContain('mengikuti');
  });

  it('caps the list at 50, dropping the oldest first', () => {
    const plan = {
      ...byNo(2),
      keywords: Array.from({ length: 49 }, (_, i) => `existingkeyword${i}`),
    };
    const learned = applyLocalLearning(plan, 'satu dua tiga empat lima enam');
    expect(learned.length).toBeLessThanOrEqual(50);
    expect(learned).toContain('existingkeyword48'); // most recent survives
  });
});
