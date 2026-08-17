/**
 * Kosakata pencocokan RK — diturunkan dari dua sumber nyata, bukan tebakan:
 *
 * 1. `202603 Cascading Kinerja 5108 Tahun 2026.xlsx` (Cascading Indikator
 *    Kinerja BPS Kabupaten Buleleng 2026). Berisi hierarki Renstra > Sasaran
 *    Kegiatan > Tim Kerja > Nama Proyek > RK Ketua > RK Anggota beserta
 *    Indikator Kinerja tiap tingkat. Indikator Kinerja Anggota Tim adalah
 *    yang paling berguna di sini: ia menyebutkan jenis pekerjaan yang
 *    diperhitungkan dalam satu RK (mis. RK "Aparatur BerAKHLAK" mencakup
 *    update PPID, SKP Tahunan/Bulanan, dan surat-menyurat/kearsipan).
 *
 * 2. Log kegiatan nyata pemilik aplikasi (Data Dukung April 2026 + Rincian
 *    Aktivitas Juli–Agustus 2026) — sumber istilah lapangan yang tidak
 *    pernah muncul di dokumen resmi (FASIH, anomali, Gojags, SHPed, IMK,
 *    VHTL, SKTNP, e-surat, dan seterusnya).
 *
 * File ini HANYA memuat sinyal yang tidak ada di data RK itu sendiri.
 * Kata kunci per RK tetap tinggal di `performance-plans-2026.ts` karena
 * pengguna dapat menyuntingnya lewat KeywordEditor di halaman Rencana
 * Kinerja; apa pun di sini bersifat statis dan berlaku untuk semua RK.
 */

/**
 * Token yang muncul di >= 15% dari 130 nama RK resmi (90 nama dari cascading
 * + 40 RK pengguna) — terukur, bukan daftar pilihan tangan.
 *
 * Ini penting: nama RK BPS dibangun dari kerangka kalimat yang sama
 * ("Terlaksananya Kegiatan Statistik X sesuai SOP dan tepat waktu"), sehingga
 * kemiripan teks mentah antara dua RK yang sama sekali berbeda bidang bisa
 * mencapai 0.92. Membandingkan nama RK tanpa membuang token ini membuat
 * "Statistik Harga" dan "Statistik Jasa" nyaris tidak terbedakan.
 */
export const RK_NAME_BOILERPLATE = new Set([
  'berkualitas',
  'dan',
  'kegiatan',
  'laporan',
  'sesuai',
  'sop',
  'statistik',
  'tepat',
  'terlaksananya',
  'terwujudnya',
  'waktu',
  'yang',
]);

/**
 * BIDANG (sumbu pertama). Diambil dari kolom Tim Kerja + Nama Proyek pada file
 * cascading — 20 tim kerja dan 38 nama proyek — lalu dilengkapi istilah survei
 * nyata yang dipakai di lapangan.
 *
 * Dipisahkan dari kata kunci per RK karena satu bidang sering dipegang
 * beberapa RK sekaligus (Tim Neraca Pengeluaran punya empat). Bidang menjawab
 * "pekerjaan ini soal apa", peran di bawah menjawab "bentuk pekerjaannya apa".
 */
export const DOMAIN_TERMS: Record<string, string[]> = {
  duk: ['sakernas', 'kependudukan', 'ketenagakerjaan', 'angkatan kerja', 'dtsen', 'susenas kor'],
  kesra: ['snlik', 'susenas', 'kesejahteraan rakyat', 'kesra', 'seruti', 'kemiskinan'],
  sdh: [
    'sumber daya hayati',
    'tanaman pangan',
    'hortikultura',
    'perkebunan',
    'peternakan',
    'perikanan',
    'ubinan',
    'podes',
    'shanti',
  ],
  industri: [
    'industri',
    'imk',
    'ibs',
    'konstruksi',
    'pertambangan',
    'sumber daya mineral',
    'industri mikro kecil',
    'industri besar sedang',
  ],
  harga: [
    'harga',
    'ihk',
    'inflasi',
    'shped',
    'shpb',
    'harga perdesaan',
    'harga produsen',
    'harga konsumen',
  ],
  distribusi_jasa: [
    'distribusi',
    'jasa',
    'vhts',
    'vhtl',
    'hotel',
    'pariwisata',
    'transportasi',
    'perdagangan',
  ],
  neraca_produksi: ['neraca produksi', 'pdrb produksi', 'pdrb lapangan usaha', 'sktnp'],
  neraca_pengeluaran: [
    'neraca pengeluaran',
    'pdrb pengeluaran',
    'konsumsi rumah tangga',
    'pmtb',
    'sklnpt',
    'sktip',
    'lembaga non profit',
  ],
  analisis: ['neraca satelit', 'analisis statistik', 'indikator makro', 'kajian statistik'],
  se2026: ['se2026', 'sensus ekonomi', 'wilkerstat', 'fasih', 'listing', 'anomali'],
  desa_cantik: ['desa cantik', 'desa cinta statistik', 'pantastik', 'agen statistik', 'perbekel'],
  sektoral: ['statistik sektoral', 'pembinaan sektoral', 'epss', 'metadata', 'romantik', 'opd'],
  yanlik: [
    'pst',
    'pelayanan statistik terpadu',
    'pekppp',
    'forum konsultasi publik',
    'ipp',
    'indeks pelayanan publik',
  ],
  akses_data: ['pelayanan data', 'permintaan data', 'perpustakaan'],
  akip: [
    'akip',
    'sakip',
    'capaian kinerja',
    'laporan kinerja',
    'lkj',
    'lakip',
    'iki',
    'perjanjian kinerja',
  ],
  humas: [
    'kehumasan',
    'media sosial',
    'instagram',
    'medsos',
    'konten',
    'infografis',
    'dokumentasi',
    'liputan',
  ],
  kepegawaian: [
    'lhkpn',
    'berakhlak',
    'presensi',
    'kearsipan',
    'mitra',
    'bangkom',
    'gojags',
    'kompetensi',
    'kepegawaian',
    'skp tahunan',
    'skp bulanan',
    'ppid',
    'upacara',
    'apel',
  ],
  anggaran: ['anggaran', 'penganggaran', 'dipa', 'pok', 'manajemen risiko', 'revisi anggaran'],
  ti: ['bmn ti', 'jaringan', 'server', 'komputer', 'inventaris ti'],
  qg: ['quality gate', 'penjaminan kualitas', 'qg gate'],
  rb: ['reformasi birokrasi', 'zona integritas', 'wbk', 'wbbm', 'transformasi statistik', 'pmprb'],
};

/** Bidang tiap RK 2026, dikunci ke `sortOrder`. */
export const PLAN_DOMAINS: Partial<Record<number, string>> = {
  1: 'duk',
  2: 'kesra',
  3: 'sdh',
  4: 'industri',
  5: 'harga',
  6: 'distribusi_jasa',
  7: 'neraca_produksi',
  8: 'neraca_produksi',
  20: 'neraca_produksi',
  9: 'neraca_pengeluaran',
  10: 'neraca_pengeluaran',
  11: 'neraca_pengeluaran',
  12: 'neraca_pengeluaran',
  13: 'yanlik',
  14: 'yanlik',
  15: 'anggaran',
  16: 'se2026',
  17: 'ti',
  18: 'akip',
  25: 'akip',
  32: 'akip',
  19: 'analisis',
  21: 'analisis',
  30: 'analisis',
  39: 'analisis',
  22: 'desa_cantik',
  23: 'sektoral',
  24: 'sektoral',
  26: 'sektoral',
  27: 'akses_data',
  28: 'humas',
  31: 'humas',
  33: 'humas',
  34: 'humas',
  29: 'kepegawaian',
  35: 'kepegawaian',
  37: 'kepegawaian',
  38: 'kepegawaian',
  36: 'qg',
  40: 'rb',
};

/**
 * PERAN (sumbu kedua). Cascading memakai pola yang sama berulang di
 * hampir setiap tim: satu RK untuk publikasi/laporan, satu untuk pelaksanaan
 * lapangan (diukur dengan respon rate), satu untuk administrasi. Bidangnya
 * saja tidak cukup untuk memilih di antara ketiganya — mis. Tim Neraca
 * Pengeluaran punya empat RK yang semuanya menyebut "neraca pengeluaran".
 */
export type RkRole = 'pelaksanaan' | 'publikasi' | 'rilis' | 'administrasi';

/** Kata dalam deskripsi kegiatan yang menandakan peran tertentu. */
export const ROLE_MARKERS: Record<RkRole, string[]> = {
  pelaksanaan: [
    'pencacahan',
    'mencacah',
    'pendataan',
    'listing',
    'lapangan',
    'pengawasan',
    'pemeriksaan',
    'memeriksa',
    'entri',
    'entry',
    'input',
    'pengolahan',
    'validasi',
    'anomali',
    'monitoring',
    'briefing',
    'pelatihan petugas',
    'supervisi',
    'assign',
    'progres',
    'respon rate',
    'response rate',
  ],
  publikasi: [
    'publikasi',
    'menyusun publikasi',
    'penyusunan',
    'naskah',
    'tabel',
    'kajian',
    'analisis',
    'laporan akhir',
    'buku',
    'dalam angka',
    'profil',
  ],
  rilis: ['rilis', 'brs', 'berita resmi statistik', 'konferensi pers', 'press release'],
  administrasi: [
    'administrasi',
    'spj',
    'honor',
    'termin',
    'pembayaran',
    'kelengkapan',
    'berkas',
    'dokumen pendukung',
    'arsip',
    'surat',
    'kontrak',
  ],
};

/**
 * Kata yang muncul di hampir semua deskripsi kegiatan apa pun bidangnya.
 * Dipakai untuk menyaring pembelajaran lokal (§12.1.4): tanpa saringan ini,
 * "rapat" atau "melakukan" ikut tersimpan sebagai kata kunci sebuah RK, dan
 * karena kata itu hanya dimiliki satu RK, pembobotan kekhasan justru
 * menganggapnya sinyal yang sangat kuat — persis kebalikan dari kenyataannya.
 */
export const GENERIC_ACTIVITY_WORDS = new Set([
  'melakukan',
  'mengikuti',
  'mengerjakan',
  'membuat',
  'menjadi',
  'menyiapkan',
  'melaksanakan',
  'kegiatan',
  'rapat',
  'zoom',
  'daring',
  'internal',
  'rutin',
  'persiapan',
  'pembahasan',
  'pelaksanaan',
  'penyelesaian',
  'terkait',
  'tahun',
  'bulan',
  'triwulan',
  'hari',
  'pagi',
  'siang',
  'sore',
  'kantor',
  'ruang',
  'bps',
  'kabupaten',
  'provinsi',
  'kecamatan',
  'desa',
  'buleleng',
  'bali',
  'petugas',
  'tim',
  'data',
  'laporan',
  'dokumen',
  'berkas',
  'progres',
]);

/**
 * Peran tiap RK 2026 milik pengguna, dikunci ke `sortOrder` (nomor RK).
 * Disimpan di sini, bukan sebagai kolom di tabel Dexie, supaya tidak perlu
 * migrasi skema database; RK buatan pengguna sendiri cukup tidak punya peran
 * (sinyal peran bernilai nol untuk RK itu, bukan error).
 */
export const PLAN_ROLES: Partial<Record<number, RkRole>> = {
  1: 'pelaksanaan',
  2: 'pelaksanaan',
  3: 'pelaksanaan',
  4: 'pelaksanaan',
  5: 'pelaksanaan',
  6: 'pelaksanaan',
  7: 'pelaksanaan',
  8: 'rilis',
  9: 'rilis',
  10: 'publikasi',
  11: 'administrasi',
  12: 'pelaksanaan',
  16: 'pelaksanaan',
  19: 'publikasi',
  20: 'administrasi',
  21: 'rilis',
  30: 'publikasi',
  31: 'rilis',
  36: 'publikasi',
  39: 'publikasi',
};
