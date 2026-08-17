import type { Activity } from '@/types';

export interface CopyModeField {
  key: string;
  label: string;
  value: string;
}

/**
 * FR-KAR-04 — urutan DAN label persis seperti dialog "Add Capaian Kegiatan
 * Perhari" di KipApp.
 *
 * Dikoreksi Agustus 2026 setelah tangkapan layar dialog itu dibaca langsung
 * dari `Panduan KipApp - Pengguna V.3.1.pdf` halaman 66. Empat hal ternyata
 * tidak cocok dengan tebakan sebelumnya:
 *
 * - Tanggal di KipApp adalah input `date` berisi `2022-12-05` — format ISO.
 *   Sebelumnya nilai yang disalin adalah "5 Desember 2022", yang TIDAK BISA
 *   ditempel ke field itu sama sekali. `activity.date` sendiri sudah ISO, jadi
 *   sekarang dipakai apa adanya.
 * - Labelnya "Kegiatan", bukan "Deskripsi".
 * - Labelnya "Progres" (satu huruf s), bukan "Progress".
 * - Labelnya "Data Dukung", bukan "Link Bukti Dukung".
 * - Status capaian bukan field teks melainkan checkbox "Masukan ke capaian
 *   SKP", jadi nilainya dinyatakan sebagai perintah centang/jangan centang —
 *   menempelkan kalimat "Masuk capaian SKP" ke sana tidak ada artinya.
 */
export function buildCopyModeFields(activity: Activity): CopyModeField[] {
  return [
    { key: 'date', label: 'Tanggal', value: activity.date },
    { key: 'startTime', label: 'Jam Mulai', value: activity.startTime },
    { key: 'endTime', label: 'Jam Selesai', value: activity.endTime },
    { key: 'description', label: 'Kegiatan', value: activity.description },
    { key: 'progress', label: 'Progres', value: String(activity.progress) },
    { key: 'achievement', label: 'Capaian', value: activity.achievement },
    { key: 'evidenceLink', label: 'Data Dukung', value: activity.evidenceLink ?? '' },
    {
      key: 'countsTowardSkp',
      label: 'Masukan ke capaian SKP',
      value: activity.countsTowardSkp ? 'centang' : 'jangan centang',
    },
  ];
}

// §10.12.1 — teks baku untuk tombol "Salin Semua", memakai label KipApp yang sama.
export function buildSalinSemuaText(activity: Activity): string {
  return buildCopyModeFields(activity)
    .map((field) => `${field.label}: ${field.value}`)
    .join('\n');
}
