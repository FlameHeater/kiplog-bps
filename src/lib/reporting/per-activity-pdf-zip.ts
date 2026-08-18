import { generateDataDukungPdf, type PdfActivityInput } from './pdf-data-dukung';
import type { UserProfile } from '@/types';

/**
 * Pola nama berkas bawaan, persis seperti yang diminta pemilik proyek:
 * `20260817_Bukti Dukung Kegiatan_Fadly Muhamad Akbar.pdf`
 */
export const DEFAULT_PDF_NAME_PATTERN = '{tanggal}_Bukti Dukung Kegiatan_{nama}';

/**
 * Token yang bisa dipakai di pola nama berkas.
 *
 * Sengaja sedikit dan semuanya berasal dari data yang pasti ada pada tiap
 * kegiatan; token yang bergantung pada isian opsional akan menghasilkan nama
 * kosong-sebagian yang membingungkan saat berkasnya sudah terlanjur di dalam
 * ZIP.
 */
export const PDF_NAME_TOKENS = [
  { token: '{tanggal}', label: 'Tanggal kegiatan, format YYYYMMDD' },
  { token: '{tanggal-strip}', label: 'Tanggal kegiatan, format YYYY-MM-DD' },
  { token: '{nama}', label: 'Nama pegawai dari Profil' },
  { token: '{nip}', label: 'NIP dari Profil' },
  { token: '{kegiatan}', label: 'Deskripsi kegiatan' },
  { token: '{rk}', label: 'Nama Rencana Kinerja' },
] as const;

/** Panjang aman satu nama berkas di dalam ZIP, di luar akhiran `.pdf`. */
const MAX_NAME_LENGTH = 120;

/**
 * Membuang karakter yang tidak boleh ada di nama berkas.
 *
 * Windows menolak `\ / : * ? " < > |`, dan titik atau spasi di ujung membuat
 * berkas sulit dibuka setelah diekstrak. Deskripsi kegiatan sering memuat
 * garis miring ("Survei/Sensus"), jadi ini bukan kasus langka.
 */
export function sanitizeFileName(input: string): string {
  return (
    input
      .replace(/[\\/:*?"<>|]/g, '-')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[. ]+$/, '')
      .slice(0, MAX_NAME_LENGTH)
      .trim()
  );
}

export interface PdfNameContext {
  tanggal: string;
  nama: string;
  nip: string;
  kegiatan: string;
  rk: string;
}

/**
 * Mengisi pola nama berkas.
 *
 * Token yang tidak dikenal DIBIARKAN apa adanya, tidak dihapus: kalau pengguna
 * salah ketik `{tangal}`, ia akan melihatnya di nama berkas dan tahu harus
 * memperbaiki polanya — jauh lebih baik daripada token itu lenyap tanpa jejak.
 */
export function renderPdfName(pattern: string, context: PdfNameContext): string {
  const filled = pattern
    .replace(/\{tanggal-strip\}/g, context.tanggal)
    .replace(/\{tanggal\}/g, context.tanggal.split('-').join(''))
    .replace(/\{nama\}/g, context.nama)
    .replace(/\{nip\}/g, context.nip)
    .replace(/\{kegiatan\}/g, context.kegiatan)
    .replace(/\{rk\}/g, context.rk);
  const safe = sanitizeFileName(filled);
  return safe || 'Kegiatan';
}

/**
 * Menamai seluruh berkas sekaligus, dengan nama kembar diberi urutan.
 *
 * Pola bawaan hanya memuat tanggal dan nama pegawai, jadi dua kegiatan pada
 * hari yang sama PASTI bernama sama — dan ZIP yang berisi dua entri bernama
 * identik akan kehilangan salah satunya saat diekstrak. Karena itu penomoran
 * ini bukan kehalusan, melainkan syarat supaya tidak ada kegiatan yang hilang.
 */
export function buildUniqueNames(names: string[]): string[] {
  const used = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const seen = used.get(key) ?? 0;
    used.set(key, seen + 1);
    return seen === 0 ? `${name}.pdf` : `${name} (${seen + 1}).pdf`;
  });
}

export interface PerActivityZipProgress {
  done: number;
  total: number;
}

/**
 * Satu PDF Data Dukung per kegiatan, dibungkus ZIP.
 *
 * PDF-nya dibuat lewat `generateDataDukungPdf` yang sama dengan laporan
 * gabungan — hanya diberi satu kegiatan per panggilan — supaya isi dan tata
 * letaknya tidak pernah berbeda antara kedua jalur unduhan.
 *
 * Dibuat berurutan, bukan paralel: tiap PDF memuat gambar bukti dukung yang
 * didekode di memori, dan mengerjakan puluhan sekaligus pada perangkat biasa
 * bisa menghabiskan memori di tengah jalan.
 */
export async function generatePerActivityPdfZip(
  items: PdfActivityInput[],
  profile: UserProfile,
  pattern: string = DEFAULT_PDF_NAME_PATTERN,
  onProgress?: (progress: PerActivityZipProgress) => void
): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  const names = buildUniqueNames(
    items.map((item) =>
      renderPdfName(pattern, {
        tanggal: item.activity.date,
        nama: profile.name,
        nip: profile.nip,
        kegiatan: item.activity.description,
        rk: item.plan?.name ?? '',
      })
    )
  );

  for (let index = 0; index < items.length; index++) {
    const blob = await generateDataDukungPdf([items[index]!], profile);
    zip.file(names[index]!, blob);
    onProgress?.({ done: index + 1, total: items.length });
  }

  return zip.generateAsync({ type: 'blob' });
}
