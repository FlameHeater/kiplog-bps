# Pemilihan RK otomatis dari deskripsi kegiatan

Bagaimana KipLog menebak Rencana Kinerja hanya dari teks deskripsi kegiatan,
dari mana kosakatanya berasal, dan seberapa akurat hasil pengukurannya.

Tetap **deterministik, tanpa LLM** (PRD §12.1) dan tidak pernah memilih
sendiri: rekomendasi harus diklik "Pilih" oleh pengguna (FR-SRK-01..07).

## Sumber data

| Sumber | Isi | Dipakai untuk |
|---|---|---|
| `202603 Cascading Kinerja 5108 Tahun 2026.xlsx` | 412 baris, hierarki Renstra → Sasaran Kegiatan → Tim Kerja → Nama Proyek → RK Ketua → RK Anggota, beserta Indikator Kinerja tiap tingkat. 20 tim kerja, 38 nama proyek, 90 nama RK. | Daftar bidang resmi, dan jenis pekerjaan apa yang masuk ke satu RK |
| Data Dukung April 2026 (PDF) | 46 kegiatan, 14 di antaranya sudah berpasangan dengan RK | Data uji berlabel |
| Rincian Aktivitas Juli–Agustus 2026 (PDF) | 39 deskripsi kegiatan tambahan | Kosakata lapangan |

Catatan penting soal cakupan file cascading: file itu **tidak memuat daftar
kegiatan per RK**. Tingkat perinciannya berhenti di nama proyek ("Kegiatan
Statistik Harga"), bukan kegiatan harian ("Pemeriksaan dokumen SHPed di Pasar
Anyar"). Kolom Indikator Kinerja Anggota Tim adalah yang paling mendekati —
ia menyebut jenis luaran yang dihitung dalam satu RK, mis. RK "Aparatur
BerAKHLAK" mencakup update PPID, SKP Tahunan/Bulanan, dan surat-menyurat serta
kearsipan. Istilah kegiatan sehari-hari (FASIH, anomali, SKTNP, VHTL, Gojags,
e-surat) hanya ada di log kegiatan nyata, bukan di dokumen resmi.

Kolom tingkat Anggota Tim juga banyak yang kosong untuk sebagian tim (mis.
Tim Statistik Harga hanya terisi di tingkat Ketua Tim), sehingga 7 dari 40 RK
pengguna tidak punya baris padanan di file itu.

## Model pencocokan

Dua sumbu, mengikuti struktur file cascading itu sendiri:

- **Bidang** — "pekerjaan ini soal apa". Dari kolom Tim Kerja + Nama Proyek. 22 bidang di `src/data/rk-vocabulary-2026.ts`.
- **Bentuk pekerjaan** — "wujud pekerjaannya apa": `pelaksanaan` lapangan, `publikasi`, `rilis`, atau `administrasi`. Dari kolom Indikator Kinerja, yang mengulang pola sama di hampir setiap tim.

Sumbu kedua diperlukan karena satu bidang sering dipegang beberapa RK: Tim
Neraca Pengeluaran punya empat RK yang semuanya menyebut "neraca pengeluaran".
Bidang saja tidak bisa memilih di antaranya.

### Bobot sinyal

| Sinyal | Maks | Catatan |
|---|---|---|
| Kata kunci | 45 | Dibagi jumlah RK yang memakai kata itu — kata milik satu RK bernilai penuh, kata milik tiga RK dibagi tiga |
| Bidang | 25 | **Sengaja di bawah ambang 35** |
| Bentuk pekerjaan | +15 / −10 | Hanya berlaku di dalam bidang yang cocok |
| Kemiripan nama RK | 8 | Hanya atas token yang membedakan |
| Tag kegiatan | 8 | |
| Mirip kegiatan sebelumnya di RK ini | 10 | Gerbang Dice ≥ 0.5 |
| Frekuensi + kebaruan pemakaian | 10 | |
| Nama tim / RK atasan | 4 | |

Ambang tampil: **35**. Konsekuensi yang disengaja dari kalibrasi ini:

- Satu kata kunci **khas** cukup sendirian (45 ≥ 35).
- Bidang saja **tidak** cukup (25 < 35), sehingga deskripsi yang hanya menyebut bidangnya memunculkan beberapa kandidat untuk dipilih pengguna, bukan satu jawaban percaya diri yang berpeluang salah.
- Bidang + bentuk pekerjaan cukup (25 + 15 = 40).

### Tiga cacat yang diperbaiki

1. **Kecocokan satu kata kunci selalu terbuang.** Bobot lamanya 32, di bawah ambang 35 — kata sekhas "sakernas" atau "shped" tak pernah bisa memunculkan RK-nya sendirian.
2. **Kemiripan nama RK didominasi kerangka kalimat.** Nama RK BPS memakai pola yang sama ("Terlaksananya Kegiatan Statistik X sesuai SOP dan tepat waktu"), sehingga "Statistik Harga" dan "Statistik Jasa" mencapai kemiripan 0,92 tanpa berbagi bidang sama sekali. 12 token yang muncul di ≥ 15% dari 130 nama RK resmi kini dibuang lebih dulu — daftarnya terukur, bukan pilihan tangan.
3. **Kata kunci berupa frasa panjang pecah karena satu kata sisipan.** "rilis neraca pengeluaran" gagal untuk "rilis BRS neraca pengeluaran". Diatasi oleh sumbu bidang + bentuk pekerjaan yang tidak bergantung pada kata bersebelahan.

Frasa bidang polos ("neraca produksi", "neraca pengeluaran", "opd") sengaja
tidak dicantumkan sebagai kata kunci RK mana pun: bidang sudah punya sinyal
sendiri, dan bila satu RK sebidang mencantumkannya sementara yang lain tidak,
RK itu tampak paling khas hanya karena bidangnya disebut.

## Hasil pengukuran

Terhadap 85 deskripsi kegiatan nyata (14 berlabel RK):

| | Sebelum | Sesudah |
|---|---|---|
| Tepat di posisi teratas (dari 14 berlabel) | 13 (93%) | **14 (100%)** |
| Deskripsi yang mendapat rekomendasi | 27 / 85 (32%) | **79 / 85 (93%)** |

Masalah utama versi lama adalah cakupan, bukan ketepatan: ia hampir selalu
benar ketika berani menjawab, tetapi dua dari tiga deskripsi nyata tidak
mendapat rekomendasi apa pun.

Enam deskripsi yang tetap tidak dapat rekomendasi memuat istilah yang belum
dikenal (LTB, Simfoni, "Pendataan Lengkap Perguruan Tinggi", pembayaran termin,
"Halal bi Halal", "Rilis BRS Provinsi Bali" tanpa penyebutan bidang). Untuk
kasus seperti ini abstain lebih baik daripada menebak — dan setelah pengguna
memilih RK-nya sekali, pembelajaran lokal (§12.1.4) menyimpan istilah itu
sendiri.

Angka di atas diukur ulang lewat skrip evaluasi sekali-jalan, bukan test yang
ikut ter-commit — korpusnya memuat log kegiatan pribadi dan tidak dimasukkan ke
repositori. Kasus yang mewakilinya disalin ke
`tests/lib/matching/rk-matcher.test.ts`.

## Yang perlu diperiksa pengguna

- **`sktip`** dipetakan ke Neraca Pengeluaran berdasarkan dugaan atas kepanjangannya. Kalau ternyata milik Neraca Produksi, pindahkan lewat editor kata kunci di halaman Rencana Kinerja.
- **`pantastik`** dan **`shanti`** diambil dari log kegiatan tanpa sumber resmi yang menjelaskannya; keduanya dipasang ke bidang tempat mereka muncul (Desa Cantik dan Sumber Daya Hayati).
- **`ltb`** sengaja tidak dipetakan karena kepanjangannya belum pasti.

## Memakai kosakata baru di data yang sudah ada

Seeding hanya berjalan saat tabel RK masih kosong, jadi pemasangan yang sudah
berisi 40 RK tidak otomatis menerima kata kunci baru. Tombol **"Perbarui kata
kunci bawaan"** di halaman Rencana Kinerja menggabungkannya ke RK yang sudah
tersimpan; kata kunci yang Anda tambahkan sendiri dan yang dipelajari otomatis
tidak diubah. Kata kunci bawaan yang pernah Anda hapus akan muncul kembali —
hapus lagi bila memang tidak diinginkan.
