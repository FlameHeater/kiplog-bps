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
 * Warna dasar tiap status, ditetapkan pemilik proyek:
 * draft kuning, lengkap hijau muda, siap lapor hijau tua, sudah dilaporkan
 * oranye, arsip abu-abu.
 *
 * Nilainya hidup sebagai token `--status-*` di `theme.css`, bukan hex di sini,
 * supaya satu definisi melayani mode terang dan gelap sekaligus. Nilai terang
 * sudah dihitung lolos WCAG AA (4.5:1) sebagai teks di atas kartu putih —
 * kuning dan hijau muda murni gagal telak di situ, jadi keduanya digelapkan
 * secukupnya sambil tetap terbaca sebagai kuning dan hijau muda.
 *
 * Warna BUKAN satu-satunya penanda status: tiap kartu selalu menampilkan nama
 * statusnya sebagai teks pada badge. Itu yang menjaga kartu tetap terbaca bagi
 * pengguna dengan buta warna, karena kuning, hijau muda, dan oranye punya
 * terang yang berdekatan dan hanya dibedakan rona.
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
 * panjang, bukan hanya saat tiap badge dibaca satu per satu.
 */
export const STATUS_CARD_CLASS: Record<ActivityStatus, string> = {
  draft: 'border-l-status-draft bg-status-draft/5',
  complete: 'border-l-status-complete bg-status-complete/5',
  ready_to_report: 'border-l-status-ready bg-status-ready/5',
  reported: 'border-l-status-reported bg-status-reported/5',
  // Arsip tetap diredupkan: ia memang tidak menuntut perhatian lagi.
  archived: 'border-l-status-archived bg-status-archived/5 opacity-75',
};
