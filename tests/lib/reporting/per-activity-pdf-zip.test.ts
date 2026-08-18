import { describe, expect, it } from 'vitest';
import {
  buildUniqueNames,
  DEFAULT_PDF_NAME_PATTERN,
  renderPdfName,
  sanitizeFileName,
} from '@/lib/reporting/per-activity-pdf-zip';

const context = {
  tanggal: '2026-08-17',
  nama: 'Fadly Muhamad Akbar',
  nip: '200103202024121004',
  kegiatan: 'Perbaikan Anomali SE2026',
  rk: 'Telaksananya Kegiatan Sensus Ekonomi 2026 sesuai SOP dan tepat waktu',
};

describe('renderPdfName', () => {
  it('menghasilkan nama persis seperti format yang diminta', () => {
    expect(renderPdfName(DEFAULT_PDF_NAME_PATTERN, context)).toBe(
      '20260817_Bukti Dukung Kegiatan_Fadly Muhamad Akbar'
    );
  });

  it('memakai tanggal tanpa pemisah untuk {tanggal}, dan dengan pemisah untuk {tanggal-strip}', () => {
    expect(renderPdfName('{tanggal}', context)).toBe('20260817');
    expect(renderPdfName('{tanggal-strip}', context)).toBe('2026-08-17');
  });

  it('mengisi token lain yang tersedia', () => {
    expect(renderPdfName('{nip} {kegiatan}', context)).toBe(
      '200103202024121004 Perbaikan Anomali SE2026'
    );
    expect(renderPdfName('{rk}', context)).toContain('Sensus Ekonomi 2026');
  });

  it('membiarkan token salah ketik apa adanya, tidak menghapusnya diam-diam', () => {
    // Token yang lenyap tanpa jejak membuat pengguna mengira polanya benar.
    expect(renderPdfName('{tangal}_x', context)).toBe('{tangal}_x');
  });

  it('tidak pernah menghasilkan nama kosong', () => {
    expect(renderPdfName('   ', context)).toBe('Kegiatan');
  });
});

describe('sanitizeFileName', () => {
  it('mengganti karakter yang ditolak sistem berkas', () => {
    // Deskripsi kegiatan sering memuat garis miring, mis. "Survei/Sensus".
    expect(sanitizeFileName('Survei/Sensus: "Khusus" *2026*')).toBe(
      'Survei-Sensus- -Khusus- -2026-'
    );
  });

  it('membuang titik dan spasi di ujung yang membuat berkas sulit dibuka', () => {
    expect(sanitizeFileName('Laporan akhir...  ')).toBe('Laporan akhir');
  });

  it('merapatkan spasi berlebih', () => {
    expect(sanitizeFileName('Rapat    koordinasi')).toBe('Rapat koordinasi');
  });

  it('memotong nama yang terlalu panjang', () => {
    expect(sanitizeFileName('x'.repeat(400)).length).toBeLessThanOrEqual(120);
  });
});

describe('buildUniqueNames', () => {
  it('memberi nomor urut pada nama kembar, bukan membiarkannya saling menimpa', () => {
    // Pola bawaan hanya memuat tanggal dan nama, jadi dua kegiatan pada hari
    // yang sama PASTI bernama sama; tanpa penomoran, salah satunya hilang saat
    // ZIP diekstrak.
    const names = buildUniqueNames(['20260817_Bukti', '20260817_Bukti', '20260818_Bukti']);
    expect(names).toEqual([
      '20260817_Bukti.pdf',
      '20260817_Bukti (2).pdf',
      '20260818_Bukti.pdf',
    ]);
  });

  it('menganggap nama yang hanya beda huruf besar-kecil sebagai kembar', () => {
    // Windows tidak membedakan huruf besar-kecil pada nama berkas.
    expect(buildUniqueNames(['Bukti', 'bukti'])).toEqual(['Bukti.pdf', 'bukti (2).pdf']);
  });

  it('memberi akhiran .pdf pada semuanya', () => {
    expect(buildUniqueNames(['a', 'b']).every((n) => n.endsWith('.pdf'))).toBe(true);
  });
});
