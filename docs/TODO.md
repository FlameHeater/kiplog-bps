# Yang Menggantung — KipLog BPS

Ditulis 2026-08-18 sebagai titik lanjut setelah sesi panjang autofill KipApp,
laporan per kegiatan, dan pembaruan tampilan.

Tidak ada yang mendesak. Seluruh pekerjaan sudah terpush ke `main`,
`npm run verify` bersih (232 test), dan aplikasi tayang di
<https://flameheater.github.io/kiplog-bps/>.

**Cara memakai berkas ini di sesi baru:** minta baca berkas ini lebih dulu,
lalu bagian akhir [ASSUMPTIONS.md](ASSUMPTIONS.md) untuk alasan di balik tiap
keputusan. Kalau satu butir sudah selesai, hapus butirnya dari sini.

---

## A. Menunggu percobaan pengguna

Semuanya sudah tayang tetapi belum pernah dilihat/dicoba langsung — asisten
tidak bisa membuka aplikasinya sendiri karena terkunci di layar login Google,
dan tidak boleh memasukkan kredensial.

### A1. Autofill KipApp v12 di form sungguhan

Terakhir dikonfirmasi berjalan pada v10; sesudah itu ada dua perubahan yang
belum diuji: pencabutan penanda "sudah pernah disimpan" dan penantian centang
yang asinkron.

Yang perlu diperhatikan:

- Tarik ulang bookmark setelah deploy, **pastikan judul panel menulis v12**.
  Skrip tertanam di dalam bookmark dan tidak pernah ter-update sendiri.
- Antrean **tidak melewati apa pun lagi**. Posisi antrean harus diarahkan
  sendiri (Berikutnya / Lompat ke tanggal berikutnya) sebelum Jalankan
  otomatis, karena menjalankan ulang atas kegiatan yang sudah masuk akan
  memasukkannya dua kali.
- Kalau berhenti, kirim pesan panelnya apa adanya. Pesannya membedakan
  penyebab (pilihan RK tidak muncul, tanggal ditolak, dialog tidak menutup).
- Tombol **Salin diagnosa** melaporkan struktur form tanpa membocorkan isi
  field.

### A2. ZIP PDF per kegiatan (menu Laporan)

Coba dulu dengan periode pendek — sehari atau seminggu — sebelum sebulan penuh.
Periksa: nama berkas sesuai pola, isi tiap PDF hanya kegiatan bersangkutan, dan
penomoran `(2)`/`(3)` untuk beberapa kegiatan di hari yang sama.

### A3. Tampilan baru

- Foto profil dan logo unit kerja (Pengaturan › My Profile). Logo unit baru
  terlihat efeknya di kop PDF Data Dukung.
- Logo aplikasi (Pengaturan › Tampilan), pengganti lambang "K" di sidebar.
- Animasi masuk halaman, pindah menu, dan muncul-saat-digulir di Dashboard.
- Warna status kegiatan: draft kuning, lengkap hijau muda, siap lapor hijau
  tua, sudah dilaporkan oranye, arsip abu-abu. Cek juga di mode gelap.
- Bilah Simpan yang menempel di dasar dialog Kegiatan: harus rapat ke tepi
  bawah, dan isi form lewat di belakangnya saat digulir.
- Daftar Rencana Kinerja di dalam dialog: roda tetikus harus menggulir
  daftarnya, bukan dialog di belakangnya.

### A4. Tombol "Perbarui kata kunci bawaan"

Di halaman **Rencana Kinerja**, sekali klik. Tanpa ini, kosakata RK hasil
kalibrasi Agustus 2026 tidak pernah sampai ke data yang sudah ada — seeding
hanya berjalan saat tabel RK masih kosong.

Dampaknya terukur pada 85 deskripsi kegiatan nyata: cakupan rekomendasi RK
otomatis naik dari 27/85 (32%) menjadi 79/85 (93%).

---

## B. Menunggu keputusan pengguna

### B1. Periode SKP: triwulanan (KipApp) vs bulanan (KipLog)

KipApp 2026 memakai periode triwulanan ("1 April - 30 Juni (Triwulan II)"),
sedangkan KipLog memodelkan `skpPeriod` sebagai `YYYY-MM`.

Tidak berpengaruh pada autofill — field SKP di dialog hanya teks baca.
Berpengaruh pada arti "Kunci Periode" di halaman KipApp Ready dan pada
rekonsiliasi Excel Pelaksanaan.

Belum diubah karena menyentuh skema delapan tabel Dexie; perlu keputusan
eksplisit dan rencana migrasi.

### B2. Centang Area Reformasi Birokrasi di kop PDF

Field `rbAreas` sudah dibuang dari form Kegiatan atas permintaan pemilik
proyek, tetapi kop PDF Data Dukung masih mencentang delapan kotak Area RB
berdasarkan field itu. Kegiatan baru karena itu tidak akan punya centang apa
pun di kop.

Kalau kantor masih membutuhkannya, cara paling ringan adalah menurunkannya
otomatis dari RK yang dipilih — bukan mengembalikan delapan checkbox ke form.

### B3. Warna "Sudah Dilaporkan"

Sekarang oranye sesuai penetapan pemilik proyek. Kalau terasa seperti
peringatan padahal maksudnya status paling selesai, bertukar dengan hijau tua
hanya satu baris di `theme.css`.

---

## C. Utang teknis yang diketahui

### C1. CRUD dan import CSV untuk Rencana Kinerja

FR-DAT-03/04/05 berstatus P0 di PRD tetapi tidak pernah masuk daftar kerja fase
mana pun. `RencanaKinerjaPage` masih baca-saja selain penyuntingan kata kunci.

### C2. Performance Lighthouse mobile

86–87 vs ambang 90 (NFR-10). Sisa gap sepenuhnya dari First/Largest Contentful
Paint — karakteristik aplikasi client-side-rendered. Memperbaikinya butuh
SSR/prerendering.

### C3. Tiga pemetaan kosakata RK yang belum pasti

- `sktip` dipetakan ke Neraca Pengeluaran atas dugaan kepanjangannya.
- `pantastik` dan `shanti` diambil dari log kegiatan tanpa sumber resmi.
- `ltb` sengaja tidak dipetakan karena kepanjangannya belum pasti.

Semuanya bisa dikoreksi sendiri lewat editor kata kunci di halaman Rencana
Kinerja.

### C4. Ketergantungan pada kerangka Ant Design

Autofill mencocokkan field lewat nama class Ant Design Vue 1.x (`ant-select`,
`ant-calendar-picker`, `ant-checkbox-input`, `ant-row`). Kalau KipApp berganti
versi atau kerangka, autofill akan berhenti — bukan salah diam-diam, karena
tiap field diperiksa ulang setelah diisi dan kegagalan dilaporkan.

---

## D. Pelajaran yang jangan diulang

Dicatat karena tiga kali menghabiskan waktu pemilik proyek dalam sesi ini.

1. **Tiruan test yang tidak setia lebih buruk daripada tidak ada.** Tiga kali
   test hijau sementara produksi gagal: `<select>` alih-alih combobox Ant
   Design, kalender yang menerima Enter tanpa `keyCode`, dan tiruan yang
   menyapu seluruh `document.body`.

2. **Jangan menyimpan kesimpulan tentang keadaan sistem lain.** "Sudah
   tersimpan", "berhasil karena notifikasi muncul", "gagal karena bacaan
   seketika" — tiap kesimpulan yang disimpan menjadi sumber kesalahan
   berikutnya. Yang bertahan hanya pengamatan langsung pada saat bertindak:
   dialognya menutup atau tidak, nilainya berubah atau tidak.

3. **Ukur dulu sebelum memperbaiki.** Kalibrasi matcher RK dimulai dengan
   mengukur baseline, dan hasilnya membalik arah kerja: masalahnya cakupan
   (32%), bukan ketepatan (93%) seperti yang diduga.
