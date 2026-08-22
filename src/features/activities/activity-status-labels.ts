import type { ActivityStatus } from '@/types';

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  draft: 'Draft',
  complete: 'Lengkap',
  ready_to_report: 'Siap Lapor',
  reported: 'Sudah Dilaporkan',
  archived: 'Diarsipkan',
};

export const ACTIVITY_STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = (
  Object.entries(ACTIVITY_STATUS_LABELS) as [ActivityStatus, string][]
).map(([value, label]) => ({ value, label }));

/**
 * Warna dasar tiap status — draft amber, lengkap biru, siap lapor zamrud,
 * sudah dilaporkan ungu, arsip abu-abu. Lima rona kategorial yang sengaja
 * direntangkan jauh di roda warna (lihat komentar `--status-*` di
 * theme.css untuk alasan lengkap kenapa palet lama diganti — pasangan
 * kuning/oranye dan hijau-muda/hijau-tua yang lama terlalu berdekatan
 * huenya, jadi nyaris tak terpisah pada garis aksen 4px).
 *
 * Nilainya hidup sebagai token `--status-*` di `theme.css`, bukan hex di sini,
 * supaya satu definisi melayani mode terang dan gelap sekaligus, sudah lolos
 * WCAG AA (4.5:1) sebagai teks di atas kartu putih/navy gelap.
 *
 * Warna BUKAN satu-satunya penanda status: tiap kartu selalu menampilkan nama
 * statusnya sebagai teks pada badge, supaya tetap terbaca bagi pengguna
 * dengan buta warna.
 */
export const STATUS_BADGE_CLASS: Record<ActivityStatus, string> = {
  draft: 'bg-status-draft/15 text-status-draft',
  complete: 'bg-status-complete/15 text-status-complete',
  ready_to_report: 'bg-status-ready/15 text-status-ready',
  reported: 'bg-status-reported/15 text-status-reported',
  archived: 'bg-status-archived/15 text-status-archived',
};

/**
 * Status juga mewarnai seluruh kartu — garis aksen kiri dan rona latar tipis —
 * bukan hanya badge-nya, supaya kartu bisa dibedakan sekilas dalam daftar
 * panjang, bukan hanya saat tiap badge dibaca satu per satu. Rona latar
 * dinaikkan ke /10 (dari /5 semula) supaya bedanya lebih terlihat tanpa
 * mengorbankan keterbacaan teks kartu.
 */
export const STATUS_CARD_CLASS: Record<ActivityStatus, string> = {
  draft: 'border-l-status-draft bg-status-draft/10',
  complete: 'border-l-status-complete bg-status-complete/10',
  ready_to_report: 'border-l-status-ready bg-status-ready/10',
  reported: 'border-l-status-reported bg-status-reported/10',
  // Arsip tetap diredupkan: ia memang tidak menuntut perhatian lagi.
  archived: 'border-l-status-archived bg-status-archived/10 opacity-75',
};
