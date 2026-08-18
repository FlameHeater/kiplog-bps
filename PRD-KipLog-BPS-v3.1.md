# PRODUCT REQUIREMENTS DOCUMENT — KipLog BPS

**Personal Performance & Evidence Management System**

| | |
|---|---|
| **Versi Dokumen** | 3.1 — divalidasi terhadap Panduan KipApp V3.1 dan daftar RK 2026 empat kolom |
| **Status** | Ready for Implementation |
| **Tipe Produk** | Companion web app, local-first, single-user |
| **Target Runtime** | Browser modern (desktop & mobile), tanpa backend |
| **Target Deploy** | GitHub Pages (static hosting) |
| **Sumber tervalidasi** | Panduan KipApp V3.1 (108 hal.) · Daftar Rencana Kinerja 2026 (40 RK, 4 kolom: No · Jenis · RK Atasan · RK) · Contoh Data Dukung Laporan Kegiatan TW-I |
| **Artefak pendamping** | `src/data/performance-plans-2026.ts` — seed 40 RK siap pakai |

---

## 0. CARA MENGGUNAKAN DOKUMEN INI (BACA LEBIH DAHULU)

Dokumen ini adalah **spesifikasi mengikat**, bukan brainstorming. Perlakukan setiap requirement ber-ID (`FR-xx`, `NFR-xx`, `AC-xx`, `CON-xx`, `DR-xx`) sebagai kontrak.

### 0.1 Protokol kerja

1. **Baca seluruh dokumen sebelum menulis satu baris kode.** Perhatikan khusus §3 — di sanalah letak sebagian besar keputusan produk yang tidak intuitif.
2. **Kerjakan Deliverable 0 (§21) terlebih dahulu**, lalu **BERHENTI** dan tunggu persetujuan.
3. Setelah disetujui, implementasikan **fase per fase** sesuai §20. Setiap akhir fase: jalankan `npm run verify`, laporkan hasil, **BERHENTI**, tunggu persetujuan.
4. **Jangan mengimplementasikan fitur di luar fase yang sedang dikerjakan**, walaupun terlihat mudah.
5. Setiap fase harus **runnable dan dapat diuji** sendiri. Tidak boleh ada state yang tidak bisa di-`build`.

### 0.2 Menangani ambiguitas

- **Jangan mengarang data domain** (nama Rencana Kinerja, istilah KipApp, format resmi). Tanyakan.
- **Untuk keputusan teknis kecil**, pilih opsi paling sederhana yang tidak menutup opsi masa depan, catat di `docs/ASSUMPTIONS.md` dengan format `[YYYY-MM-DD] Konteks → Keputusan → Alasan`, lalu lanjutkan.
- **Untuk keputusan yang memengaruhi model data atau arsitektur**, hentikan pekerjaan dan tanyakan.

### 0.3 Larangan mutlak untuk agent

- Jangan menambahkan dependency di luar §11 tanpa izin.
- Jangan membuat backend, server, atau API sebagai dependency MVP.
- Jangan membuat file >400 baris tanpa alasan; pecah menjadi modul.
- Jangan menulis `TODO` atau stub sebagai pengganti implementasi fitur P0.
- Jangan meng-commit data pribadi asli (nama, NIP, isi bukti dukung) ke repository.

---

## 1. PERAN & MANDAT

Anda bertindak sebagai tim produk lengkap: **Product Manager, Software Architect, UX/UI Designer, Full-Stack Engineer, Data Engineer, dan QA Engineer**.

Mandat: merancang dan membangun **KipLog BPS** — aplikasi web pendamping personal yang membantu pegawai BPS mencatat kegiatan kerja harian, mengelola bukti dukung, menghubungkannya dengan Rencana Kinerja, dan menghasilkan **berkas Data Dukung siap unggah beserta tautannya** untuk diinput ke KipApp.

**Kalimat inti produk:**

> Catat pekerjaan sekali → kelola bukti dukung → hasilkan berkas Data Dukung → simpan tautannya → tempel ke KipApp.

### 1.1 Constraint mengikat (CON)

| ID | Constraint |
|---|---|
| **CON-01** | KipLog adalah **companion app**, bukan pengganti/replika/klien KipApp. |
| **CON-02** | **Tidak boleh** mengasumsikan adanya API KipApp. Tidak ada integrasi otomatis. |
| **CON-03** | **Dilarang** melakukan scraping, headless-browser automation, atau login otomatis ke KipApp (`https://webapps.bps.go.id/kipapp/`). **Direvisi 2026-08-17** atas permintaan eksplisit pemilik proyek setelah larangan ini dibacakan ulang kepadanya: diizinkan **satu** pengecualian sempit berupa bookmarklet autofill yang dijalankan pengguna sendiri di tab KipApp yang sudah ia login (lihat CON-03a). Larangan scraping, headless-browser, dan login otomatis tetap berlaku utuh. |
| **CON-03a** | Bookmarklet autofill hanya boleh: berjalan di host `kipapp.bps.go.id` atau `webapps.bps.go.id` (keduanya diperiksa hidup 2026-08-18; alamat pertama yang dipakai pemilik proyek), **menulis** ke field form, dan melaporkan field yang gagal ditemukan. **Dilarang**: membaca/mengirim data KipApp ke mana pun, dan berjalan tanpa tindakan sadar pengguna. **Direvisi kedua kali 2026-08-18** atas permintaan eksplisit pemilik proyek setelah konsekuensinya dibacakan: larangan menekan Save DICABUT untuk mode otomatis, yang mengisi–menyimpan–membuka Add secara berantai sampai antrean habis. Syarat mode itu ada di CON-03b. |
| **CON-03b** | Mode otomatis wajib: berhenti total pada kegagalan pertama (pengisian tidak lengkap, simpanan ditolak, atau dialog tidak menutup) alih-alih melanjutkan; memakai **menutupnya dialog** sebagai bukti tersimpan, bukan teks notifikasi; menyimpan penanda anti-ganda supaya satu kegiatan tidak pernah tersimpan dua kali; menyediakan tombol berhenti yang selalu terlihat; memberi jeda antar entri; dan menyediakan pilihan jumlah kegiatan sekali jalan (10/20/30/40/semua) supaya pengguna punya titik henti untuk memeriksa hasilnya. Mode manual (isi saja, pengguna menekan Save) tetap tersedia dan tetap menjadi bawaannya. |
| **CON-04** | **Dilarang** meminta, menyimpan, atau mengirim kredensial community/KipApp dalam bentuk apa pun. |
| **CON-05** | MVP **wajib berjalan penuh tanpa backend**. Semua data tersimpan di perangkat pengguna. |
| **CON-06** | **Dilarang** mengirim isi kegiatan/bukti dukung ke server pihak ketiga (termasuk analytics). Pada MVP: nol permintaan jaringan keluar. |
| **CON-07** | Status `Sudah diinput ke KipApp` adalah **penanda manual pengguna**. UI dilarang menyiratkan aplikasi mengirim data ke KipApp. |
| **CON-08** | Terminologi KipApp tidak boleh diterjemahkan atau diganti di UI. Gunakan label persis §2.2. |
| **CON-09** | KipLog **tidak mengunggah apa pun ke Google Drive/OneDrive secara otomatis**. Pengguna mengunggah sendiri; KipLog hanya menyimpan tautan yang ditempelkan pengguna. |

---

## 2. LATAR BELAKANG (TERVALIDASI TERHADAP PANDUAN V3.1)

### 2.1 Konteks

KipApp adalah aplikasi web pengelolaan kinerja PNS di lingkungan BPS, sesuai PermenPAN RB No. 8 Tahun 2021. Alurnya: Renstra → Perjanjian Kinerja → Rencana Kinerja → Perencanaan Kinerja (SKP Tahunan & Bulanan) → **Pelaksanaan Kinerja** → Penilaian Kinerja.

KipLog hanya menyentuh satu titik: **Menu Pelaksanaan Kinerja → Submenu Pelaksanaan**, tempat pegawai menginput pekerjaan harian.

### 2.2 Alur input KipApp yang sebenarnya (rujukan mengikat)

Urutan operasi di KipApp adalah **hierarkis, bukan berbasis tanggal**:

```
1. Pilih Pegawai (otomatis)
2. Pilih Tahun
3. Pilih Periode SKP        ← bulan
4. Pilih Rencana Kinerja    ← SATU RK dipilih lebih dahulu
5. Klik Add
6. Isi form kegiatan
7. Save  → kegiatan masuk ke daftar RK tersebut
8. Ulangi 5–7 untuk semua kegiatan pada RK yang sama
9. Kembali ke langkah 4 untuk RK berikutnya
```

**Field pada form Add (urutan dan label persis):**

| Urutan | Label KipApp | Catatan |
|---|---|---|
| 1 | Tanggal | |
| 2 | Jam mulai kegiatan | |
| 3 | Jam selesai kegiatan | |
| 4 | Deskripsi kegiatan | |
| 5 | Progress kegiatan | |
| 6 | Capaian hasil kegiatan | |
| 7 | **Link bukti dukung** | **Berupa URL, bukan unggahan file** |
| 8 | **Status capaian** | Apakah kegiatan dimasukkan ke capaian SKP atau tidak |

**Kolom pada daftar Pelaksanaan:**
`Tanggal` · `Rencana Kinerja` · `Kegiatan` · `Progress` · `Capaian` · `Bukti Dukung` · `Capaian SKP` · `Dikirim`

**Aksi yang tersedia di KipApp:** Edit · **Copy** (untuk RK yang dikerjakan beberapa hari — pegawai cukup mengubah tanggal, jam, progress, dan capaian) · Update status penyelesaian RK menjadi **Selesai** · **Kirim untuk Dinilai** · **Download Excel**.

**Batasan waktu:** pengisian catatan kinerja dibatasi **setiap akhir bulan**, karena akan dinilai Ketua Tim sebagai referensi penilaian SKP Bulanan.

**Sifat tak-terbalikkan (kritis):**
- Capaian kinerja yang sudah dikirim untuk dinilai **tidak bisa dibatalkan atau diedit**.
- Mencentang **Kirim SKP untuk dinilai** mengunci seluruh bulan — tidak bisa lagi menginput capaian untuk RK mana pun di bulan tersebut.

**Status SKP Bulanan:** `Sedang dibuat` → `Sedang diperiksa` → `Dinilai`.

**Jenis Rencana Kinerja:**
- **Utama** — cascading dari RK JPT/Ka. BPS Kab/Kota atau penugasan langsung; menjadi tugas utama pegawai. Tampil di menu Hasil Kerja untuk dinilai Ketua Tim.
- **Tambahan** — kontribusi di luar tugas pokok jabatan namun sesuai kompetensi. Tidak tampil di Hasil Kerja; hanya di SKP Bulanan.

### 2.3 Masalah yang diselesaikan

| # | Masalah | Solusi KipLog |
|---|---|---|
| P1 | Pencatatan kegiatan sering terlupakan; batas waktunya akhir bulan | Calendar-first + coverage + hitung mundur akhir bulan |
| P2 | Bukti dukung tersebar (folder, WA, Drive, screenshot) | Evidence Inbox + Evidence Gallery |
| P3 | Sulit menentukan kegiatan masuk RK yang mana (ada 40 RK) | Smart RK Recommendation |
| P4 | KipApp meminta **tautan** bukti dukung, sehingga bukti harus dirapikan, dijadikan berkas, diunggah, dan tautannya dicatat — pekerjaan manual paling melelahkan | Generator Data Dukung PDF + Link Registry (§9.13) |
| P5 | Penyusunan laporan bukti dukung sangat manual | Report Generator + Evidence Pack |
| P6 | Kegiatan berulang harus ditulis ulang | Template + Duplicate |
| P7 | Tidak ada dashboard kelengkapan pelaporan personal | Dashboard + Monthly Review |
| P8 | Input KipApp harus per-RK, sedangkan ingatan pegawai berbasis tanggal | Mode kerja ganda: catat per tanggal, setor per RK (§9.12) |
| P9 | Format laporan tidak konsisten | Template baku "Data Dukung Laporan Kegiatan" (§13.1) |

### 2.4 Non-goals (jangan dibangun)

Multi-user, hierarki atasan-bawahan, approval, penilaian kinerja · integrasi/sinkronisasi dengan KipApp · manajemen SKP, IKI, target, Renstra, Perjanjian Kinerja · absensi/time-tracking otomatis · notifikasi push/email/WA · unggah otomatis ke cloud storage.

---

## 3. TIGA TEMUAN YANG MENGUBAH DESAIN

> Bagian ini wajib dibaca. Ketiganya adalah koreksi terhadap asumsi umum tentang produk ini, dan masing-masing mengubah arsitektur fitur.

### 3.1 Bukti dukung di KipApp adalah **TAUTAN**, bukan unggahan file

Panduan V3.1 menyebut field ke-7 secara harfiah: **"link bukti dukung"**.

**Konsekuensi:** menyimpan file di KipLog saja **tidak menyelesaikan masalah pengguna**. Rantai pekerjaan yang sebenarnya adalah:

```
bukti berserakan → dirapikan → dijadikan satu berkas Data Dukung
    → diunggah ke Google Drive → disalin tautannya → ditempel ke KipApp
```

Karena itu **produk inti KipLog bukan galeri file, melainkan pabrik berkas Data Dukung + registri tautan**:

1. KipLog menyimpan bukti mentah (Evidence Inbox / Gallery).
2. KipLog **menghasilkan PDF "Data Dukung Laporan Kegiatan"** — persis seperti contoh yang ada, karena berkas itulah yang selama ini diunggah ke Drive.
3. Pengguna mengunggah PDF tersebut ke Drive **sendiri** (CON-09), lalu menempelkan tautannya kembali ke KipLog.
4. KipLog menyimpan tautan itu di `Activity.evidenceLink` dan menyajikannya sebagai field siap-salin di Copy Mode.

Alur ini menjadi **fitur unggulan §9.13 (Link Registry)**. Tanpa itu, KipLog hanya memindahkan masalah.

### 3.2 "Status capaian" bukan status penyelesaian — melainkan **Capaian SKP (ya/tidak)**

Panduan menjelaskan: *status capaian (apakah kegiatan tersebut akan dimasukkan ke capaian SKP atau tidak)*. Kolom di daftar pun bernama **"Capaian SKP"**.

Jadi ini **boolean**, bukan enum `Selesai / Dalam Proses`. Model data menggunakan `countsTowardSkp: boolean`. Menebak enum di sini akan menghasilkan field yang tidak bisa dipetakan ke KipApp.

### 3.3 KipApp bekerja **per Rencana Kinerja**, pengguna berpikir **per tanggal**

Di KipApp, pengguna memilih Tahun → Periode SKP → **satu RK**, baru menambahkan kegiatan. Untuk memindahkan sebulan penuh, ia harus berpindah RK berkali-kali.

Sebaliknya, ingatan manusia bekerja kronologis: "Selasa kemarin saya ngapain?"

**KipLog wajib mendukung keduanya:**
- **Mode pencatatan** (harian) — berbasis kalender dan tanggal.
- **Mode penyetoran** (§9.12 KipApp Ready) — **dikelompokkan per Rencana Kinerja, diurutkan tanggal di dalamnya**, meniru urutan kerja KipApp persis.

Inilah pemetaan ulang yang membuat KipLog benar-benar menghemat waktu. Copy Mode yang hanya berurut tanggal justru memaksa pengguna melompat-lompat di KipApp.

---

## 4. GLOSARIUM

| Istilah KipApp | Definisi | Nama teknis (kode) |
|---|---|---|
| **Rencana Kinerja (RK)** | Butir sasaran kinerja; induk setiap kegiatan | `PerformancePlan` |
| **Jenis RK** | `Utama` (cascading/tugas pokok) atau `Tambahan` (di luar tugas pokok) | `type` |
| **Rencana Kinerja Atasan** | RK JPT/Ketua Tim tempat RK pegawai di-cascade | `parentPlanName` |
| **Periode SKP** | Bulan pelaporan SKP Bulanan | `skpPeriod` (`YYYY-MM`) |
| **Kegiatan** | Pekerjaan pada tanggal & rentang jam tertentu | `Activity` |
| **Deskripsi Kegiatan** | Uraian pekerjaan | `description` |
| **Capaian Hasil Kegiatan** | Kalimat hasil, umumnya "Terselesaikannya …" | `achievement` |
| **Progress Kegiatan** | Angka 0–100 (tanpa tanda persen) | `progress` |
| **Status Capaian / Capaian SKP** | Apakah kegiatan dihitung ke capaian SKP | `countsTowardSkp` |
| **Link Bukti Dukung** | URL berkas bukti yang diinput ke KipApp | `evidenceLink` |
| **Dikirim** | Kegiatan sudah dikirim ke Ketua Tim (tak dapat diedit) | `sentForReview` |
| **Bukti dukung mentah** | File/tautan yang dikelola KipLog sebelum jadi berkas | `Evidence` |
| **Evidence Inbox** | Bukti yang belum ditautkan ke kegiatan | `inboxStatus` |
| **Data Dukung Laporan Kegiatan** | Berkas PDF resmi yang diunggah dan ditautkan | — |

**Aturan bahasa:** UI berbahasa **Indonesia** dengan label persis KipApp. Identifier kode, nama file, dan komentar berbahasa **Inggris**.

---

## 5. SOURCE OF TRUTH & ATURAN DATA

### 5.1 Aturan mengikat

| ID | Aturan |
|---|---|
| **DR-01** | Wording Rencana Kinerja **disalin persis** dari sumber — **termasuk salah ketik**. Sumber memuat `Terlaksananyanya`, `Telaksananya`, `Prioduksi`. **Jangan diperbaiki**: KipApp mencocokkan berdasarkan teks, dan koreksi diam-diam akan membuat data tidak cocok. |
| **DR-02** | Sediakan kolom opsional `displayName` untuk versi rapi yang dipakai di UI, sementara `name` tetap verbatim dan **selalu** dipakai untuk ekspor/salin. |
| **DR-03** | **Dilarang mengarang** RK yang tidak ada di sumber, termasuk untuk demo. |
| **DR-04** | **Jangan mencampur RK Atasan dengan RK pegawai.** Keduanya dua kolom berbeda di sumber; RK pegawai adalah yang dipilih di KipApp. Simpan RK Atasan sebagai metadata konteks saja. |
| **DR-05** | Menonaktifkan RK **tidak boleh** memutus kegiatan lama yang memakainya (soft-deactivate). |
| **DR-06** | Master RK harus dapat diedit dan di-import karena berubah tiap tahun. |
| **DR-07** | Jika sumber tidak menyebut kategori/tag sebuah RK, biarkan kosong. Jangan menebak. |
| **DR-08** | Field `teamLeader` memuat **nama pegawai lain**. Jika repository dipublikasikan, jangan commit seed apa adanya: kosongkan `teamLeader` di repo dan isi lewat Import CSV secara lokal, atau masukkan file seed ke `.gitignore` dan sediakan `performance-plans-2026.example.ts` tanpa nama. Berlaku juga untuk `parentPlanName` bila memuat identitas. |

### 5.2 Seed data — 40 Rencana Kinerja 2026 (semua Jenis: **Utama**)

File seed siap pakai tersedia sebagai `src/data/performance-plans-2026.ts`, memuat keempat kolom sumber ditambah `category`, `keywords`, `tags`, dan `color`. Tabel di bawah adalah rujukan verbatim untuk verifikasi.

Struktur sumber memiliki empat kolom: `No` · `Jenis` · **`Rencana Kinerja Atasan`** · **`Rencana Kinerja`**. Kolom "Rencana Kinerja" adalah milik pegawai dan **inilah yang dipilih di KipApp**; kolom "Rencana Kinerja Atasan" hanya konteks cascading.

| No | Rencana Kinerja (verbatim — dipilih di KipApp) | Rencana Kinerja Atasan (verbatim) | Tim Kerja |
|---|---|---|---|
| 1 | Terlaksananyanya Kegiatan Statistik Kependudukan dan Ketenagakerjaan sesuai SOP dan tepat waktu | Terselenggaranya Kegiatan Statistik Kependudukan dan Ketenagakerjaan sesuai SOP dan tepat waktu | Statistik Kependudukan, Ketenagakerjaan dan Ketahanan Sosial |
| 2 | Terlaksananya Kegiatan Statistik Kesejahteraan Rakyat Sesuai SOP dan Berkualitas | Terselenggaranya Kegiatan Statistik Kesejahteraan Rakyat sesuai SOP dan tepat waktu | Statistik Kesejahteraan Rakyat |
| 3 | Terlaksananya Kegiatan Statistik Sumber Daya Hayati sesuai SOP dan tepat waktu | Terselenggaranya Kegiatan Statistik Sumber Daya Hayati sesuai SOP dan tepat waktu | Statistik Sumber Daya Hayati |
| 4 | Terwujudnya Persentase Respon Rate Kegiatan Statistik Industri | Terselenggaranya Kegiatan Statistik Industri sesuai SOP dan tepat waktu | Statistik Industri, Sumber Daya Mineral dan Konstruksi |
| 5 | Terlaksananya Kegiatan Statistik Harga sesuai SOP dan tepat waktu. | Terselenggaranya Kegiatan Statistik Harga sesuai SOP dan tepat waktu. | Statistik Harga |
| 6 | Terlaksananya Kegiatan Statistik Jasa sesuai SOP dan tepat waktu | Terselenggaranya Kegiatan Statistik Jasa sesuai SOP dan tepat waktu | Statistik Distribusi dan Jasa |
| 7 | Terlaksananya Kegiatan Neraca Produksi sesuai SOP dan berkualitas | Terselenggaranya Kegiatan Neraca Produksi sesuai SOP dan tepat waktu | Neraca dan Analisis Statistik |
| 8 | Terlaksananya rilis data Neraca Prioduksi yang berkualitas dan tepat waktu | Terwujudnya Penyediaan Data dan Insight Neraca Produksi yang Berkualitas | Neraca dan Analisis Statistik |
| 9 | Terwujudnya rilis data Neraca Pengeluaran yang berkualitas dan tepat waktu | Terwujudnya Penyediaan Data dan Insight Neraca Pengeluaran yang Berkualitas | Neraca dan Analisis Statistik |
| 10 | Terwujudnya Publikasi/Laporan Neraca Pengeluaran yang Berkualitas | Terwujudnya Penyediaan Data dan Insight Neraca Pengeluaran yang Berkualitas | Neraca dan Analisis Statistik |
| 11 | Terlaksananya Penyelesaian Kegiatan Administrasi Neraca Pengeluaran tepat waktu | Terselenggaranya Kegiatan Neraca Pengeluaran sesuai SOP dan tepat waktu | Neraca dan Analisis Statistik |
| 12 | Terlaksananya Kegiatan Neraca Pengeluaran sesuai SOP dan berkualitas | Terselenggaranya Kegiatan Neraca Pengeluaran sesuai SOP dan tepat waktu | Neraca dan Analisis Statistik |
| 13 | Terlaksananya Forum Konsultasi Publik PST | Terwujudnya Pelayanan Publik yang berkualitas | Pembinaan Statistik Sektoral dan Indeks Pelayanan Publik |
| 14 | Terlaksananya Kegiatan Pengumpulan Bukti Dukung PEKPPP | Terwujudnya Pelayanan Publik yang berkualitas | Pembinaan Statistik Sektoral dan Indeks Pelayanan Publik |
| 15 | Terlaksananya Efektivitas dan Efisiensi Perencanaan dan Penganggaran didukung oleh Penguatan Manajemen Risiko | Terwujudnya Efektivitas dan Efisiensi Perencanaan dan Penganggaran didukung oleh Penguatan Manajemen Risiko | SAKIP, Administrasi, dan Keuangan |
| 16 | Telaksananya Kegiatan Sensus Ekonomi 2026 sesuai SOP dan tepat waktu | Terselenggaranya Kegiatan Sensus Ekonomi 2026 sesuai SOP dan tepat waktu | Sensus Ekonomi |
| 17 | Terwujudnya persentase Penyelesaian Pemeliharaan BMN TI | Terwujudnya kegiatan Teknologi Informasi untuk Menghasilkan Statistik Berkualitas | Integrasi Pengolahan dan Pelayanan Statistik Terpadu |
| 18 | Tersedianya Laporan capaian Kinerja yang berkualitas tepat waktu | Terwujudnya Laporan capaian Kinerja yang berkualitas tepat waktu | SAKIP, Administrasi, dan Keuangan |
| 19 | Terwujudnya publikasi/laporan Analisis Statistik dan Neraca Satelit yang berkualitas | Terwujudnya Penyediaan Data dan Insight Analisis Statistik dan Neraca Satelit yang Berkualitas | Neraca dan Analisis Statistik |
| 20 | Terwujudnya Penyelesaian Kegiatan Administrasi Neraca Produksi tepat waktu | Terselenggaranya Kegiatan Neraca Produksi sesuai SOP dan tepat waktu | Neraca dan Analisis Statistik |
| 21 | Terwujudnya rilis data Analisis Statistik dan Neraca Satelit yang berkualitas dan tepat waktu | Terwujudnya Penyediaan Data dan Insight Analisis Statistik dan Neraca Satelit yang Berkualitas | Neraca dan Analisis Statistik |
| 22 | Terwujudnya Persentase Kumulatif Desa yang Berpredikat Desa Cinta Statistik | Terwujudnya Kapasitas Tata Kelola Pemerintah Desa untuk Menghasilkan Statistik Berkualitas | Desa Cinta Statistik |
| 23 | Terwujudnya Metadata dari OPD yang dibina | Terwujudnya Penguatan Penyelenggaraan Pembinaan Statistik Sektoral Pemerintah Daerah | Pembinaan Statistik Sektoral dan Indeks Pelayanan Publik |
| 24 | Terwujudnya Rekomendasi Statistik dari OPD yang dibina | Terwujudnya Penguatan Penyelenggaraan Pembinaan Statistik Sektoral Pemerintah Daerah | Pembinaan Statistik Sektoral dan Indeks Pelayanan Publik |
| 25 | Tersedianya Laporan tindak lanjut SAKIP yang telah diselesaikan tepat waktu | Terwujudnya Laporan capaian Kinerja yang berkualitas tepat waktu | SAKIP, Administrasi, dan Keuangan |
| 26 | Terlaksananya Pembinaan Statistik Sektoral ke OPD | Terwujudnya Penguatan Penyelenggaraan Pembinaan Statistik Sektoral Pemerintah Daerah | Pembinaan Statistik Sektoral dan Indeks Pelayanan Publik |
| 27 | Terwujudnya pelayanan data statistik yang dilayani tepat waktu | Terwujudnya Kemudahan Akses Data BPS | Integrasi Pengolahan dan Pelayanan Statistik Terpadu |
| 28 | Terwujudnya laporan kegiatan kehumasan | Terwujudnya Penyebaran Informasi dan Kehumasan yang Berkualitas | Hubungan Masyarakat |
| 29 | Tersedianya Pelaporan LHKPN dan SPT tepat waktu | Terwujudnya Aparatur yang BerAKHLAK | SAKIP, Administrasi, dan Keuangan |
| 30 | Terwujudnya penyusunan LK indikator sementara bagi pemeriksa maupun supervisor kegiatan statistik maupun inovasi Analisis Statistik untuk penunjang kualitas kegiatan statistik | Terselenggaranya Kegiatan Analisis Statistik dan Neraca Satelit sesuai SOP dan tepat waktu | Neraca dan Analisis Statistik |
| 31 | Terwujudnya rilis data dan publikasi di media sosial | Terwujudnya Penyebaran Informasi dan Kehumasan yang Berkualitas | Hubungan Masyarakat |
| 32 | Tersedianya Laporan Kinerja yang berkualitas dan tepat waktu | Terwujudnya Laporan capaian Kinerja yang berkualitas tepat waktu | SAKIP, Administrasi, dan Keuangan |
| 33 | Terwujudnya penyampaian kegiatan BPS di media sosial | Terwujudnya Penyebaran Informasi dan Kehumasan yang Berkualitas | Hubungan Masyarakat |
| 34 | Terlaksananya kegiatan kehumasan lainnya | Terwujudnya Penyebaran Informasi dan Kehumasan yang Berkualitas | Hubungan Masyarakat |
| 35 | Tersedianya SDM yang berkualitas | Terwujudnya Aparatur yang BerAKHLAK | SAKIP, Administrasi, dan Keuangan |
| 36 | Terwujudnya Laporan Penjaminan Kualitas Kegiatan Statistik (QG) yang berkualitas | Terselenggaranya Kegiatan Analisis Statistik dan Neraca Satelit sesuai SOP dan tepat waktu | Neraca dan Analisis Statistik |
| 37 | Tersedianya penyelesaian Rekrutmen Mitra yang tepat waktu dan sesuai SOP | Terwujudnya Aparatur yang BerAKHLAK | SAKIP, Administrasi, dan Keuangan |
| 38 | Tersedianya Aparatur yang BerAKHLAK | Terwujudnya Aparatur yang BerAKHLAK | SAKIP, Administrasi, dan Keuangan |
| 39 | Terwujudnya Materi Rapat Kegiatan Statistik ke Eksternal yang berkualitas | Terselenggaranya Kegiatan Analisis Statistik dan Neraca Satelit sesuai SOP dan tepat waktu | Neraca dan Analisis Statistik |
| 40 | Terlaksananya Reformasi Birokrasi dan Transformasi Statistik yang berkelanjutan | Terwujudnya Reformasi Birokrasi dan Transformasi Statistik yang berkelanjutan | Reformasi Birokrasi |

**Salah ketik yang WAJIB dipertahankan (DR-01):** No. 1 `Terlaksananyanya` · No. 16 `Telaksananya` · No. 8 `Prioduksi`.

### 5.3 Tim kerja dan Ketua Tim

40 RK tersebar pada **14 tim kerja** dengan **12 Ketua Tim** (dua orang memimpin dua tim). Ini penting karena di KipApp, **Kirim untuk Dinilai ditujukan kepada Ketua Tim**, sehingga penyetoran secara alami dikelompokkan per Ketua Tim.

| Tim Kerja | Ketua Tim | RK |
|---|---|---|
| Statistik Kependudukan, Ketenagakerjaan dan Ketahanan Sosial | I Ketut Ariasa SE | 1 |
| Statistik Kesejahteraan Rakyat | Alit Mahendra SST | 2 |
| Statistik Sumber Daya Hayati | Nyoman Subaktiyasa SE | 3 |
| Statistik Industri, Sumber Daya Mineral dan Konstruksi | Ni Made Egy Wira Astuti SST | 4 |
| Statistik Harga | I Made Oka Suarjaya SST, M.SE. | 5 |
| Statistik Distribusi dan Jasa | Raden Agus Setiyo Purnawan SE | 6 |
| Neraca dan Analisis Statistik | Ketut Ksama Putra SST,. M.Si. | 7–12, 19–21, 30, 36, 39 |
| Pembinaan Statistik Sektoral dan Indeks Pelayanan Publik | I Made Kariasa SST, M.SE. | 13, 14, 23, 24, 26 |
| SAKIP, Administrasi, dan Keuangan | Ni Made Pratiwi Pendit S.Si., M.Si | 15, 18, 25, 29, 32, 35, 37, 38 |
| Sensus Ekonomi | I Wayan Pariarta SST | 16 |
| Integrasi Pengolahan dan Pelayanan Statistik Terpadu | Nyoman Pasek Susena S.E. | 17, 27 |
| Desa Cinta Statistik | I Ketut Ariasa SE | 22 |
| Hubungan Masyarakat | Kharisma Pandu Utama S.Tr.Stat. | 28, 31, 33, 34 |
| Reformasi Birokrasi | I Wayan Pariarta SST | 40 |

Distribusi ini sangat timpang: **13 RK di bawah Neraca dan 8 di bawah SAKIP** menyumbang lebih dari separuh daftar. Kelompokkan combobox berdasarkan tim agar daftar 40 item dapat dipindai.

### 5.4 Kelompok RK yang mudah tertukar

Enam kelompok berikut memiliki teks nyaris identik atau berbagi Rencana Kinerja Atasan yang sama. Ketika salah satu anggotanya muncul di combobox atau panel rekomendasi, UI **wajib** menampilkan pembeda (RK Atasan + tim), bukan hanya nama RK.

| Kelompok | RK | Pembeda yang harus ditampilkan |
|---|---|---|
| Kegiatan neraca "sesuai SOP dan berkualitas" | 7, 12 | Produksi vs Pengeluaran |
| Rilis data | 8, 9, 21 | Produksi vs Pengeluaran vs Analisis Statistik |
| Rilis vs publikasi Neraca Pengeluaran | 9, 10 | rilis data vs publikasi/laporan |
| Administrasi neraca | 11, 20 | Pengeluaran vs Produksi |
| Laporan kinerja | 18, 25, 32 | capaian kinerja vs tindak lanjut SAKIP vs Laporan Kinerja |
| Pembinaan sektoral (atasan sama) | 23, 24, 26 | metadata vs rekomendasi vs pembinaan |
| Kehumasan (atasan sama) | 28, 31, 33, 34 | laporan vs rilis medsos vs penyampaian kegiatan vs lainnya |
| BerAKHLAK (atasan sama) | 29, 35, 37, 38 | LHKPN/SPT vs SDM vs rekrutmen mitra vs aparatur |

Daftar ini tersedia sebagai konstanta `CONFUSABLE_PLAN_GROUPS` di file seed dan wajib dipakai oleh §10.4 dan §12.1.

> **Catatan bagi implementor:** 40 RK dengan delapan kelompok yang mudah tertukar adalah alasan utama Smart RK Recommendation (§12.1) bernilai tinggi. Daftar sepanjang ini tidak bisa dipindai mata setiap kali menambah kegiatan.

### 5.5 Kata kunci awal untuk matching

`keywords` seed sudah terisi di `performance-plans-2026.ts` berdasarkan istilah yang muncul di pekerjaan sehari-hari, bukan diambil dari nama RK — misalnya RK 2 memakai `snlik`, `susenas`, `seruti`; RK 16 memakai `se2026`, `listing`, `ppl`, `pml`; RK 22 memakai `desa cantik`, `lke`, `perbekel`. Kata kunci akan bertambah sendiri seiring pemakaian (§12.1.4). Biarkan kosong bila ragu; kata kunci yang salah lebih merugikan daripada tidak ada kata kunci.

---

## 6. VISI PRODUK & PRINSIP DESAIN

### 6.1 Visi

> **Jurnal kerja digital pribadi yang mengubah pekerjaan sehari-hari menjadi berkas dokumentasi kinerja siap unggah dan siap tempel.**

### 6.2 Enam prinsip

| Prinsip | Konsekuensi desain |
|---|---|
| **Capture once** | Data dimasukkan sekali; semua tampilan dan laporan adalah turunan. |
| **Organize automatically** | Sistem mengelompokkan sendiri per tanggal, minggu, bulan, RK, periode SKP, status, tag. |
| **Reuse by default** | Kegiatan berulang lewat Template atau Duplicate — meniru fitur Copy milik KipApp. |
| **Evidence-first** | Bukti adalah warga kelas satu dan bisa masuk sebelum kegiatan dibuat. |
| **Deliver a link, not a file** | Output akhir yang dibutuhkan KipApp adalah **URL**. Setiap fitur bukti dukung harus bermuara ke sana. |
| **Mirror KipApp's work order** | Saat menyetor, urutan kerja KipLog harus sama persis dengan KipApp: per RK, lalu per tanggal. |

### 6.3 Diferensiasi (lindungi saat trade-off)

1. **Calendar-first** — mencegah lupa mencatat sebelum batas akhir bulan
2. **Smart RK Matching** — memangkas beban memilih dari 40 RK
3. **Evidence Inbox** — mencegah bukti tercecer
4. **Generator Data Dukung + Link Registry** — menyelesaikan rantai kerja terberat (§3.1)
5. **Copy Mode berkelompok per RK** — meniru urutan kerja KipApp (§3.3)
6. **Template & Duplicate** — mempercepat kegiatan rutin dan multi-hari
7. **Evidence Pack** — merapikan arsip sekali klik
8. **Monthly Review + hitung mundur akhir bulan** — mencegah laporan bolong

---

## 7. PENGGUNA & SKENARIO

**Primary user:** Pegawai BPS pemegang SKP dengan puluhan Rencana Kinerja aktif. Melek teknologi dasar, terbiasa Excel dan aplikasi web internal, waktu terbatas, 1–5 kegiatan berbeda per hari lintas beberapa RK.

| ID | Skenario | Target |
|---|---|---|
| **US-01** | Mencatat kegiatan yang baru selesai | < 60 detik |
| **US-02** | Menyimpan screenshot sekarang, menautkan ke kegiatan nanti | < 10 detik |
| **US-03** | Mencatat kegiatan sama untuk 5 hari berturut-turut | < 90 detik total |
| **US-04** | Merekap 3 hari terlewat pada Jumat sore | < 5 menit |
| **US-05** | Menyiapkan berkas Data Dukung + tautan untuk satu bulan | < 10 menit |
| **US-06** | Memindahkan 30 kegiatan sebulan ke KipApp | < 15 menit |
| **US-07** | Menghasilkan arsip bukti dukung sebulan untuk atasan | < 30 detik |

---

## 8. ARSITEKTUR SISTEM

### 8.1 Lapisan

Aplikasi **client-only**. Tidak ada server.

```
┌─────────────────────────────────────────────────────────┐
│ PRESENTATION   pages/ · components/ui/ · layouts/        │
│                (tanpa business logic)                     │
├─────────────────────────────────────────────────────────┤
│ FEATURE        features/{activities, evidence, plans,     │
│                templates, reports, dashboard, backup,     │
│                kipapp-ready}                              │
├─────────────────────────────────────────────────────────┤
│ DOMAIN         lib/services/   aturan bisnis murni        │
│                lib/validation/ skema Zod terpusat         │
│                lib/matching/   rekomendasi RK & capaian   │
│                lib/reporting/  PDF/XLSX/CSV/ZIP           │
│                lib/date/       SEMUA operasi tanggal      │
├─────────────────────────────────────────────────────────┤
│ DATA           db/ Dexie schema, migrations, repositories │
│                (satu-satunya lapisan penyentuh IndexedDB) │
└─────────────────────────────────────────────────────────┘
```

| ID | Aturan |
|---|---|
| **ARCH-01** | Komponen React **tidak boleh** memanggil Dexie langsung. Selalu lewat repository/hook. |
| **ARCH-02** | Business logic berada di `lib/` sebagai fungsi murni yang dapat diuji tanpa React. |
| **ARCH-03** | Tipe domain didefinisikan sekali di `src/types/`, diturunkan dari skema Zod (`z.infer`). |
| **ARCH-04** | Rancang interface repository agar implementasi cloud dapat ditambahkan tanpa mengubah lapisan atas — **tetapi jangan tulis kode cloud pada MVP**. |

### 8.2 Struktur direktori

```
kiplog-bps/
├── src/
│   ├── main.tsx · App.tsx · routes.tsx
│   ├── pages/                 # satu file per rute
│   ├── layouts/               # AppShell, Sidebar, BottomNav
│   ├── components/
│   │   ├── ui/                # shadcn/ui
│   │   └── common/            # EmptyState, PageHeader, StatCard, ConfirmDialog
│   ├── features/
│   │   ├── activities/ · evidence/ · performance-plans/
│   │   ├── templates/  · calendar/ · reports/
│   │   ├── kipapp-ready/ · dashboard/ · backup/
│   ├── db/
│   │   ├── database.ts · migrations.ts · repositories/
│   ├── lib/
│   │   ├── services/ · validation/ · matching/
│   │   ├── reporting/ · date/ · utils/
│   ├── hooks/ · types/ · data/ · styles/
├── public/
├── docs/  ARCHITECTURE.md · DATA-MODEL.md · ASSUMPTIONS.md · PRIVACY.md
├── tests/
├── .github/workflows/deploy.yml
├── README.md · vite.config.ts · tsconfig.json · package.json
```

---

## 9. MODEL DATA

### 9.1 Konvensi tipe primitif (patuhi persis)

| Konsep | Format | Alasan |
|---|---|---|
| Tanggal kalender | `string` `"YYYY-MM-DD"` | Menghindari pergeseran zona waktu. **Jangan gunakan objek `Date`.** |
| Jam | `string` `"HH:mm"` (24 jam) | Mudah dibandingkan sebagai string |
| Timestamp sistem | `string` ISO 8601 UTC | Hanya untuk `createdAt`/`updatedAt` |
| Periode SKP | `string` `"YYYY-MM"` | Turunan dari `date`, dapat di-override |
| Progress | `number` bulat 0–100 | **Disalin tanpa tanda persen** (KipApp menampilkan `100`, bukan `100%`) |
| ID | `string` UUID v4 | `crypto.randomUUID()` |
| Zona waktu | `Asia/Makassar` (WITA) | Default, dapat diubah di Pengaturan |

### 9.2 Entitas

```ts
// ─── UserProfile (singleton, id selalu "me") ─────────────────
interface UserProfile {
  id: 'me';
  name: string;                   // termasuk gelar, mis. "…, S.Tr.Stat"
  nip: string;                    // 18 digit numerik
  position: string;               // Jabatan
  unit: string;                   // Unit Kerja
  email?: string;
  logoDataUrl?: string;           // logo unit untuk kop laporan
  defaultYear: number;
  timezone: string;               // default 'Asia/Makassar'
  updatedAt: string;
}

// ─── PerformancePlan (Rencana Kinerja) ───────────────────────
interface PerformancePlan {
  id: string;
  year: number;
  type: 'Utama' | 'Tambahan';     // dari Panduan V3.1
  name: string;                   // VERBATIM dari sumber, dipakai untuk ekspor
  displayName?: string;           // versi rapi untuk UI saja (DR-02)
  parentPlanName?: string;        // Rencana Kinerja Atasan (konteks)
  teamName?: string;              // nama tim kerja
  teamLeader?: string;            // Ketua Tim penilai — lihat DR-08 soal privasi
  category: string | null;
  description?: string;
  keywords: string[];             // untuk smart matching
  tags: string[];
  color: string;                  // hex, indikator kalender
  isActive: boolean;
  isFavorite: boolean;
  sortOrder: number;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── SkpPeriod: cermin lokal status SKP Bulanan di KipApp ────
interface SkpPeriod {
  id: string;                     // "2026-08"
  year: number;
  month: number;
  // status DICATAT MANUAL oleh pengguna; KipLog tidak membacanya dari KipApp
  kipAppStatus: 'sedang_dibuat' | 'sedang_diperiksa' | 'dinilai';
  isLocked: boolean;              // true jika "Kirim SKP untuk dinilai" sudah dicentang
  lockedAt: string | null;
  notes?: string;
  updatedAt: string;
}

// ─── PlanPeriodStatus: status penyelesaian RK per periode ────
// KipApp punya "Update status penyelesaian Rencana Kinerja → Selesai"
interface PlanPeriodStatus {
  id: string;                     // `${planId}:${skpPeriod}`
  performancePlanId: string;
  skpPeriod: string;
  isCompleted: boolean;           // ditandai Selesai di KipApp
  completedAt: string | null;
}

// ─── Activity (Kegiatan) ─────────────────────────────────────
interface Activity {
  id: string;

  // — Field yang dipetakan 1:1 ke form KipApp —
  date: string;                   // Tanggal              "YYYY-MM-DD"
  startTime: string;              // Jam mulai kegiatan   "HH:mm"
  endTime: string;                // Jam selesai kegiatan "HH:mm"
  description: string;            // Deskripsi kegiatan
  progress: number;               // Progress kegiatan    0–100
  achievement: string;            // Capaian hasil kegiatan
  evidenceLink: string | null;    // Link bukti dukung    ← URL yang ditempel ke KipApp
  countsTowardSkp: boolean;       // Status capaian       ← default true (§3.2)

  // — Konteks pemilihan di KipApp —
  year: number;                   // turunan dari date, dapat di-override
  skpPeriod: string;              // "YYYY-MM", turunan, dapat di-override
  performancePlanId: string | null;

  // — Milik KipLog saja —
  durationMinutes: number;        // turunan, di-cache
  status: ActivityStatus;
  evidenceLinkStatus: EvidenceLinkStatus;
  location?: string;
  project?: string;
  notes?: string;                 // catatan pribadi, TIDAK muncul di laporan
  tags: string[];
  rbAreas: RbArea[];              // area Reformasi Birokrasi untuk kop laporan (§13.1)
  evidenceCount: number;          // turunan, di-cache
  reportedAt: string | null;      // saat ditandai sudah diinput ke KipApp
  sentForReview: boolean;         // sudah "Kirim untuk Dinilai" → tidak dapat diedit
  templateId: string | null;

  createdAt: string;
  updatedAt: string;
}

// ─── Evidence (bukti mentah, milik KipLog) ───────────────────
interface Evidence {
  id: string;
  activityId: string | null;      // null = Evidence Inbox
  kind: 'file' | 'link';

  blob?: Blob;                    // file asli di IndexedDB
  thumbnailBlob?: Blob;           // maks 400px WebP, hanya gambar
  fileName?: string;
  mimeType?: string;
  size?: number;

  url?: string;
  linkTitle?: string;
  linkProvider?: 'gdrive' | 'onedrive' | 'sharepoint' | 'internal' | 'other';

  caption: string;
  category: EvidenceCategory;
  sortOrder: number;
  inboxStatus: 'unassigned' | 'assigned' | 'archived';
  capturedAt: string | null;      // dari EXIF/mtime jika ada
  createdAt: string;
  updatedAt: string;
}

// ─── ActivityTemplate ────────────────────────────────────────
interface ActivityTemplate {
  id: string;
  name: string;
  performancePlanId: string | null;
  descriptionTemplate: string;
  achievementTemplate: string;    // mendukung {{deskripsi}} dan {{tanggal}}
  defaultProgress: number;
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultLocation?: string;
  defaultCountsTowardSkp: boolean;
  tags: string[];
  rbAreas: RbArea[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── AppSettings (singleton) ─────────────────────────────────
interface AppSettings {
  id: 'settings';
  workdays: number[];             // [1,2,3,4,5]
  holidays: string[];             // ["YYYY-MM-DD"], dapat diedit
  requireEvidenceForReady: boolean;      // default true
  requireEvidenceLinkForReady: boolean;  // default true (§3.1)
  defaultStartTime: string;
  defaultEndTime: string;
  defaultCountsTowardSkp: boolean;       // default true
  theme: 'light' | 'dark' | 'system';
  maxFileSizeMb: number;          // default 10
  autoCompressImages: boolean;    // default true
  monthEndReminderDays: number;   // default 5
  lastBackupAt: string | null;
  schemaVersion: number;
}
```

### 9.3 Enumerasi

```ts
type ActivityStatus =
  | 'draft'             // sedang disusun
  | 'complete'          // isian lengkap, belum ada tautan bukti
  | 'ready_to_report'   // lolos validasi §12.3, siap dipindah ke KipApp
  | 'reported'          // pengguna menandai sudah diinput ke KipApp
  | 'archived';

type EvidenceLinkStatus =
  | 'none'              // belum ada bukti sama sekali
  | 'collected'         // bukti mentah ada di KipLog
  | 'packaged'          // PDF Data Dukung sudah dihasilkan
  | 'uploaded'          // pengguna sudah mengunggah & menempel tautannya
  ;

type EvidenceCategory =
  | 'screenshot' | 'dokumen' | 'foto' | 'spreadsheet'
  | 'surat_tugas' | 'notulen' | 'tautan' | 'lainnya';

// 8 area Reformasi Birokrasi pada kop Data Dukung (§13.1)
type RbArea =
  | 'Penataan dan Penguatan Organisasi'
  | 'Penataan Peraturan Perundang-Undangan'
  | 'Penataan Sumber Daya Manusia'
  | 'Penataan Tata Laksana'
  | 'Peningkatan Kualitas Pelayanan Publik'
  | 'Penguatan Pengawasan'
  | 'Penguatan Akuntabilitas Kinerja'
  | 'Manajemen Perubahan';
```

### 9.4 Transisi status

```
draft ──▶ complete ──▶ ready_to_report ──▶ reported ──▶ archived
  ▲          ▲                 │                │
  └──────────┴─────────────────┴────────────────┘   (mundur diizinkan)
```

- `ready_to_report` hanya tercapai jika validasi §12.3 lolos.
- Mengedit activity `reported` memicu konfirmasi: *"Kegiatan ini sudah ditandai diinput ke KipApp. Perubahan di sini tidak mengubah data di KipApp."*
- Jika `sentForReview === true`, form **dikunci read-only** dengan penjelasan: *"Kegiatan ini sudah dikirim untuk dinilai. Di KipApp, data yang sudah dikirim tidak dapat diedit."*
- Jika `SkpPeriod.isLocked === true`, seluruh kegiatan periode itu read-only dan tombol tambah dinonaktifkan dengan penjelasan yang sama.

### 9.5 Skema & indeks Dexie

```ts
db.version(1).stores({
  userProfile:       'id',
  performancePlans:  'id, year, type, isActive, isFavorite, category, usageCount, sortOrder',
  activities:        'id, date, skpPeriod, year, performancePlanId, status, evidenceLinkStatus, *tags, [date+status], [skpPeriod+performancePlanId]',
  evidence:          'id, activityId, inboxStatus, kind, category, createdAt',
  templates:         'id, name, performancePlanId, usageCount',
  skpPeriods:        'id, year, month, isLocked',
  planPeriodStatus:  'id, performancePlanId, skpPeriod',
  settings:          'id',
});
```

Setiap perubahan skema menaikkan `db.version(n)` dengan `.upgrade()` yang idempotent. **Dilarang** mengubah `version(1)` setelah pengguna punya data.

### 9.6 Integritas referensial (manual, di lapisan repository)

- Hapus `Activity` → konfirmasi jumlah evidence; opsi **hapus** atau **kembalikan ke Evidence Inbox**.
- Hapus `PerformancePlan` yang dipakai → **blokir**, tawarkan "Nonaktifkan".
- `evidenceCount`, `durationMinutes`, `evidenceLinkStatus` di-update dalam transaksi Dexie yang sama dengan operasi induknya.

---

## 10. SPESIFIKASI FUNGSIONAL

Prioritas: **P0** (MVP wajib), **P1**, **P2**.

### 10.1 Dashboard (`FR-DSH`)

| ID | Requirement | Prio |
|---|---|---|
| FR-DSH-01 | Halaman default (`/`), sapaan sesuai waktu + nama pengguna, label periode SKP berjalan. | P0 |
| FR-DSH-02 | Kartu ringkasan bulan berjalan: hari kerja, hari terisi, hari kosong, total kegiatan, total bukti, RK terpakai vs belum, rata-rata progress, jumlah draft, jumlah siap dilaporkan, **jumlah kegiatan yang belum punya Link Bukti Dukung**. | P0 |
| FR-DSH-03 | Mini-calendar dengan indikator status per tanggal (§10.2). Klik tanggal → Day Panel. | P0 |
| FR-DSH-04 | Daftar 5 kegiatan terbaru sebagai Activity Card. | P0 |
| FR-DSH-05 | Tombol primer **+ Tambah Kegiatan** selalu terlihat (header desktop, FAB mobile). | P0 |
| FR-DSH-06 | Panel Alert pasif (§10.11), termasuk **hitung mundur batas akhir bulan**. | P0 |
| FR-DSH-07 | Bar chart distribusi kegiatan per Rencana Kinerja. | P1 |
| FR-DSH-08 | Activity heatmap 12 bulan. | P1 |
| FR-DSH-09 | Semua angka ringkasan dapat diklik dan membuka daftar terfilter. | P1 |

### 10.2 Calendar (`FR-CAL`)

| ID | Requirement | Prio |
|---|---|---|
| FR-CAL-01 | Month view default; tersedia Week dan Day view. | P0 |
| FR-CAL-02 | Sel tanggal menampilkan jumlah kegiatan, jumlah bukti, indikator status. | P0 |
| FR-CAL-03 | Indikator visual per tanggal (tabel di bawah). | P0 |
| FR-CAL-04 | Klik tanggal → Day Panel berisi seluruh kegiatan + tombol tambah. | P0 |
| FR-CAL-05 | Weekend dan hari libur ditandai berbeda dan **tidak dihitung** sebagai hari kerja. | P0 |
| FR-CAL-06 | Navigasi bulan via tombol dan keyboard (`←`/`→`, `T` = hari ini). | P0 |
| FR-CAL-07 | Tanggal masa depan dapat diisi tetapi tidak masuk perhitungan coverage. | P0 |
| FR-CAL-08 | Periode SKP yang terkunci (`isLocked`) ditandai jelas dan read-only. | P0 |
| FR-CAL-09 | Week view berupa agenda per hari, bukan grid jam. | P1 |

| Kondisi | Indikator |
|---|---|
| Hari kerja lampau tanpa kegiatan | Outline putus-putus + warna peringatan lembut |
| Ada kegiatan draft | Titik abu-abu |
| Semua kegiatan lengkap & bertautan bukti | Titik hijau penuh |
| Ada kegiatan progress < 100% | Titik kuning |
| Ada kegiatan tanpa bukti dukung | Ikon klip bercoret |
| Ada kegiatan tanpa Link Bukti Dukung | Ikon rantai putus |
| Weekend / hari libur | Latar netral, teks redup |
| Hari ini | Ring tebal pada angka tanggal |
| Periode terkunci | Arsiran halus pada seluruh bulan |

> **Aksesibilitas:** setiap indikator warna **wajib** disertai bentuk/ikon/teks alternatif (WCAG 1.4.1).

### 10.3 Activity CRUD (`FR-ACT`)

| ID | Requirement | Prio |
|---|---|---|
| FR-ACT-01 | Buat kegiatan lewat modal/sheet dari mana saja; jika dibuka dari kalender, `date` terisi otomatis. | P0 |
| FR-ACT-02 | **Urutan field pada form mengikuti urutan KipApp persis** (§2.2) agar pengguna dapat menyalin dari atas ke bawah tanpa melompat. | P0 |
| FR-ACT-03 | Field wajib saat draft: tanggal, jam mulai, jam selesai, deskripsi. Lainnya opsional. | P0 |
| FR-ACT-04 | Durasi dihitung otomatis dan ditampilkan real-time. | P0 |
| FR-ACT-05 | `year` dan `skpPeriod` terisi otomatis dari `date`, read-only dengan opsi override. | P0 |
| FR-ACT-06 | Progress: slider + input numerik tersinkron; tombol cepat 0/25/50/75/100. Disimpan sebagai angka bulat tanpa persen. | P0 |
| FR-ACT-07 | **Status Capaian** berupa toggle berlabel `Masukkan ke capaian SKP`, default sesuai `settings.defaultCountsTowardSkp`. Sertakan teks bantuan singkat. | P0 |
| FR-ACT-08 | **Link Bukti Dukung** berupa input URL dengan tombol tempel dan tombol buka. Validasi hanya `http(s)://`. | P0 |
| FR-ACT-09 | Autosave draft setiap 2 detik idle; form belum tersimpan dipulihkan saat aplikasi dibuka lagi. | P0 |
| FR-ACT-10 | Edit dan hapus, dengan konfirmasi hapus yang menyebut jumlah evidence terkait. | P0 |
| FR-ACT-11 | **Duplicate** menyalin deskripsi, RK, capaian, tags, lokasi, jam, status capaian, area RB. Tanggal default hari kerja berikutnya. Evidence tidak disalin secara default (ada checkbox). **Link Bukti Dukung tidak pernah disalin.** | P0 |
| FR-ACT-12 | **Duplicate ke rentang tanggal**: buat salinan untuk beberapa hari sekaligus, opsi lewati weekend/libur. | P1 |
| FR-ACT-13 | Halaman Activities: tabel/list dengan sort, filter (§10.9), bulk action (ubah status, tambah tag, tandai sudah diinput, hapus). | P0 |
| FR-ACT-14 | Peringatan (bukan blokir) jika jam tumpang tindih dengan kegiatan lain pada tanggal sama. | P1 |
| FR-ACT-15 | Kegiatan pada periode terkunci atau `sentForReview` bersifat read-only dengan penjelasan (§9.4). | P0 |

### 10.4 Pemilihan Rencana Kinerja (`FR-RKS`)

| ID | Requirement | Prio |
|---|---|---|
| FR-RKS-01 | Combobox yang dapat dicari — **bukan** `<select>` sepanjang 40 item. | P0 |
| FR-RKS-02 | Urutan default: Favorit → Baru digunakan (5) → Sering digunakan (5) → Sisanya per kategori/tim. | P0 |
| FR-RKS-03 | Fuzzy search debounce 200 ms; hasil menyorot bagian yang cocok. | P0 |
| FR-RKS-04 | Nama panjang di-truncate 2 baris + tooltip penuh; tampilkan pil warna dan badge `Utama`/`Tambahan`. | P0 |
| FR-RKS-05 | RK nonaktif disembunyikan dari pemilihan tetapi tetap tampil pada kegiatan lama dengan label "nonaktif". | P0 |
| FR-RKS-06 | Kelompokkan daftar berdasarkan **Tim Kerja** (14 tim), karena distribusi RK sangat timpang — 13 RK di Neraca dan 8 di SAKIP. | P0 |
| FR-RKS-07 | Untuk RK yang termasuk `CONFUSABLE_PLAN_GROUPS` (§5.4), **wajib** tampilkan Rencana Kinerja Atasan sebagai baris sekunder. Tanpa itu empat RK Kehumasan terlihat identik. | P0 |
| FR-RKS-08 | Buat RK baru langsung dari combobox tanpa meninggalkan form. | P1 |

### 10.5 Smart RK Recommendation (`FR-SRK`)

| ID | Requirement | Prio |
|---|---|---|
| FR-SRK-01 | Saat deskripsi ≥ 10 karakter, tampilkan hingga 3 rekomendasi RK di bawah field deskripsi. | P1 |
| FR-SRK-02 | Setiap rekomendasi menampilkan nama RK, skor keyakinan, dan **alasan singkat** (mis. *"cocok dengan kata kunci: snlik, petugas"*). | P1 |
| FR-SRK-03 | Sistem **tidak boleh** menetapkan RK otomatis; selalu perlu klik **Pilih**. | P1 |
| FR-SRK-04 | Sediakan **Cari lainnya** yang membuka combobox penuh. | P1 |
| FR-SRK-05 | Jika skor tertinggi di bawah ambang, tampilkan *"Tidak ada rekomendasi yang cukup meyakinkan"* — jangan memaksakan tebakan lemah. | P1 |
| FR-SRK-06 | MVP **tanpa LLM**; gunakan algoritma deterministik §12.1. | P1 |
| FR-SRK-07 | Setiap pemilihan memperkuat pembelajaran lokal (§12.1.4). | P1 |

### 10.6 Smart Capaian Generator (`FR-SCG`)

| ID | Requirement | Prio |
|---|---|---|
| FR-SCG-01 | Tombol **Sarankan capaian** di dekat field Capaian setelah deskripsi terisi. | P1 |
| FR-SCG-02 | Saran mengikuti aturan §12.2 dan **selalu bisa diedit**. | P1 |
| FR-SCG-03 | Saran hanya mengisi field yang masih kosong; **tidak menimpa** tulisan pengguna. | P1 |
| FR-SCG-04 | UI menandai teks sebagai *saran*, bukan pernyataan fakta capaian. | P1 |

### 10.7 Evidence Management (`FR-EVD`)

| ID | Requirement | Prio |
|---|---|---|
| FR-EVD-01 | Evidence Gallery per kegiatan: thumbnail, nama file, tipe, ukuran, tanggal unggah, caption, kategori. | P0 |
| FR-EVD-02 | Upload lewat drag & drop, tombol browse, dan paste clipboard (`Ctrl+V` screenshot). | P0 |
| FR-EVD-03 | Tipe didukung: PNG, JPG/JPEG, WEBP, PDF, DOC/DOCX, XLS/XLSX. Tolak lainnya dengan pesan jelas. | P0 |
| FR-EVD-04 | Batas 10 MB per file (konfigurabel). Gambar > 2 MB dikompresi ke maks 1920px, kualitas 0,85. File asli tidak disimpan ganda. | P0 |
| FR-EVD-05 | Thumbnail 400px WebP untuk gambar; PDF memakai ikon tipe file pada MVP. | P0 |
| FR-EVD-06 | Preview modal: gambar (zoom + pan), PDF (`<embed>`), file kantor (kartu info + unduh). | P0 |
| FR-EVD-07 | Aksi: preview, rename, ubah caption/kategori, unduh, hapus, ubah urutan (drag). | P0 |
| FR-EVD-08 | Upload multi-file paralel dengan progress per file dan opsi batal. | P0 |
| FR-EVD-09 | **Tambah bukti sebagai tautan** (Drive/OneDrive/SharePoint/web/internal). Simpan URL + judul saja; **jangan menyimpan kredensial atau mengambil isi tautan**. | P0 |
| FR-EVD-10 | Deteksi provider dari pola URL untuk ikon yang sesuai. | P1 |

### 10.8 Evidence Inbox (`FR-INB`)

| ID | Requirement | Prio |
|---|---|---|
| FR-INB-01 | Halaman khusus bukti yang belum ditautkan ke kegiatan. | P1 |
| FR-INB-02 | Zona drop besar; bukti tersimpan < 3 detik tanpa membuka form kegiatan. | P1 |
| FR-INB-03 | Tab status: `Unassigned` · `Assigned` · `Archived`. | P1 |
| FR-INB-04 | Tautkan ke kegiatan: pilih evidence → cari kegiatan berdasarkan tanggal/deskripsi. Mendukung multi-select. | P1 |
| FR-INB-05 | **Buat kegiatan dari bukti** — form terbuka dengan evidence terlampir; tanggal dari `capturedAt` bila ada. | P1 |
| FR-INB-06 | Badge jumlah `Unassigned` di sidebar dan dashboard. | P1 |
| FR-INB-07 | Bukti belum tertaut > 7 hari muncul sebagai alert lembut. | P1 |

### 10.9 Search & Filter (`FR-SCH`)

| ID | Requirement | Prio |
|---|---|---|
| FR-SCH-01 | Global search (`Ctrl/Cmd+K`) mencakup deskripsi, capaian, nama RK, tag, nama file evidence, caption, lokasi, catatan. | P0 |
| FR-SCH-02 | Hasil dikelompokkan per tipe dengan cuplikan konteks bersorot. | P0 |
| FR-SCH-03 | Debounce 200 ms; navigasi keyboard; Enter membuka hasil. | P0 |
| FR-SCH-04 | Filter halaman Activities: rentang tanggal, periode SKP, RK, jenis RK, status, rentang progress, ada/tidak bukti, **ada/tidak Link Bukti Dukung**, status capaian SKP, kategori, tag. | P0 |
| FR-SCH-05 | Filter aktif sebagai chip yang dapat dihapus satu per satu + **Hapus semua**. | P0 |
| FR-SCH-06 | State filter tersimpan di URL query string. | P1 |

### 10.10 Templates & Tagging (`FR-TPL`)

| ID | Requirement | Prio |
|---|---|---|
| FR-TPL-01 | CRUD template dengan field default (RK, deskripsi, capaian, progress, jam, lokasi, tag, status capaian, area RB). | P0 |
| FR-TPL-02 | Memilih template mengisi form; semua tetap dapat diubah. | P0 |
| FR-TPL-03 | **Simpan sebagai template** dari kegiatan yang sudah ada. | P0 |
| FR-TPL-04 | Template capaian mendukung `{{deskripsi}}` dan `{{tanggal}}`. | P1 |
| FR-TPL-05 | Sistem tag bebas dengan autocomplete dari tag yang sudah ada. | P0 |
| FR-TPL-06 | Tag awal yang disarankan: `SE2026`, `SNLIK`, `Desa Cantik`, `Analisis`, `Lapangan`, `Administrasi`, `Rapat`, `Kehumasan`, `Data`, `Publikasi`, `Pembinaan`, `Monitoring`. Semua dapat diubah/dihapus. | P0 |
| FR-TPL-07 | Template tanpa nama tidak dapat disimpan. | P0 |

### 10.11 Alert & Nudge (`FR-ALR`)

| ID | Requirement | Prio |
|---|---|---|
| FR-ALR-01 | Alert sebagai panel pasif di dashboard. **Dilarang** modal, toast berulang, atau notifikasi push. | P0 |
| FR-ALR-02 | Pesan: *"Anda belum mencatat kegiatan hari ini."* · *"N kegiatan belum memiliki bukti dukung."* · *"N kegiatan belum memiliki Link Bukti Dukung."* · *"N kegiatan masih dalam proses."* · *"N bukti dukung belum ditautkan."* · *"Backup terakhir N hari lalu."* | P0 |
| FR-ALR-03 | **Hitung mundur akhir bulan**: mulai `settings.monthEndReminderDays` hari sebelum akhir bulan, tampilkan *"N hari lagi menuju batas pengisian catatan kinerja bulan ini."* dengan ringkasan yang belum beres. | P0 |
| FR-ALR-04 | Alert hari ini hanya muncul setelah pukul 12.00 waktu lokal. | P0 |
| FR-ALR-05 | Setiap alert dapat ditutup untuk hari berjalan dan mengarah ke aksi perbaikan. | P0 |
| FR-ALR-06 | Maksimal 3 alert sekaligus, diurutkan berdasarkan urgensi (hitung mundur akhir bulan selalu prioritas tertinggi). | P0 |

### 10.12 KipApp Ready & Copy Mode (`FR-KAR`) — fitur pembeda

Dirancang untuk **meniru urutan kerja KipApp** (§3.3).

| ID | Requirement | Prio |
|---|---|---|
| FR-KAR-01 | Pemilih **Tahun → Periode SKP** di bagian atas, sama seperti KipApp. | P0 |
| FR-KAR-02 | Daftar kegiatan **dikelompokkan per Rencana Kinerja**, diurutkan tanggal menaik di dalam tiap kelompok. Header kelompok menampilkan nama RK penuh + tombol **Salin Nama RK** + jumlah kegiatan + jumlah yang sudah ditandai. | P0 |
| FR-KAR-03 | Kelompok RK dapat dilipat; kelompok yang seluruhnya sudah ditandai terlipat otomatis. | P0 |
| FR-KAR-04 | **Copy Mode dua kolom**: kiri = data KipLog, kanan = teks siap tempel per field KipApp, **berurutan sama dengan form KipApp** (Tanggal → Jam Mulai → Jam Selesai → Deskripsi → Progress → Capaian → Link Bukti Dukung → Status Capaian). Pada mobile menjadi bertumpuk. | P0 |
| FR-KAR-05 | Tombol salin per field, plus **Salin Semua** (format §10.12.1). | P0 |
| FR-KAR-06 | Field yang sudah disalin diberi tanda centang sementara agar pengguna tahu posisinya saat berpindah tab. | P0 |
| FR-KAR-07 | Kegiatan tanpa `evidenceLink` ditandai jelas dan tidak dapat ditandai selesai sebelum tautannya ada (jika `requireEvidenceLinkForReady`). | P0 |
| FR-KAR-08 | Tombol **Tandai sudah diinput ke KipApp** mengubah status ke `reported` dan mengisi `reportedAt`. Teks UI harus jelas bahwa ini catatan manual (CON-07). | P0 |
| FR-KAR-09 | Progress bar sesi: *"7 dari 24 kegiatan sudah ditandai · RK 3 dari 9"*. | P0 |
| FR-KAR-10 | Navigasi keyboard: `J`/`K` antar kegiatan, `C` salin semua, `Space` tandai selesai. | P1 |
| FR-KAR-10b | Pengelompokan sekunder opsional **per Ketua Tim**, karena Kirim untuk Dinilai ditujukan ke Ketua Tim. Tampilkan ringkasan per Ketua Tim: *"Ksama Putra — 3 RK, 11 kegiatan siap"*. | P1 |
| FR-KAR-11 | Tombol **Tandai RK ini Selesai di KipApp** yang mengisi `PlanPeriodStatus.isCompleted` — mencerminkan aksi "Update status penyelesaian RK". | P1 |
| FR-KAR-12 | Tombol **Kunci Periode** yang mengisi `SkpPeriod.isLocked`, disertai peringatan: *"Di KipApp, mencentang Kirim SKP untuk dinilai membuat seluruh bulan tidak dapat diedit lagi."* | P1 |

#### 10.12.1 Format teks Salin Semua (baku)

```
Tanggal: 02 Januari 2026
Jam Mulai: 08:00
Jam Selesai: 10:30
Deskripsi Kegiatan: Melakukan Input Petugas SNLIK 2026 di Website Provinsi
Progress: 100
Capaian Hasil Kegiatan: Terselesaikannya Melakukan Input Petugas SNLIK 2026 di Website Provinsi
Link Bukti Dukung: https://drive.google.com/…
Status Capaian: Masuk capaian SKP
```

Progress ditulis **tanpa tanda persen** agar cocok dengan tampilan KipApp.

### 10.13 Link Registry & Alur Data Dukung (`FR-LNK`) — fitur pembeda inti

Menjawab masalah P4 (§2.3) dan temuan §3.1.

| ID | Requirement | Prio |
|---|---|---|
| FR-LNK-01 | Halaman **Bukti & Tautan** menampilkan setiap kegiatan beserta `evidenceLinkStatus` dalam empat kolom Kanban: `Belum ada bukti` → `Bukti terkumpul` → `Berkas dibuat` → `Tautan tersimpan`. | P1 |
| FR-LNK-02 | Aksi massal **Buat Berkas Data Dukung** untuk kegiatan terpilih: menghasilkan satu PDF per kegiatan sesuai §13.1 dan mengubah status ke `packaged`. | P1 |
| FR-LNK-03 | Setelah berkas dihasilkan, tampilkan panduan tiga langkah: unduh berkas → unggah ke folder Drive Anda → tempel tautannya di sini. **KipLog tidak mengunggah apa pun sendiri** (CON-09). | P1 |
| FR-LNK-04 | Field tempel tautan massal: satu baris per kegiatan, mendukung tempel banyak URL sekaligus dari clipboard dalam urutan yang sama dengan daftar. | P1 |
| FR-LNK-05 | Validasi URL (`http(s)` saja) + tombol buka di tab baru untuk verifikasi. | P1 |
| FR-LNK-06 | Simpan `defaultDriveFolderUrl` opsional di Pengaturan sebagai pintasan pembuka folder — hanya tautan, bukan integrasi. | P1 |
| FR-LNK-07 | Indikator ringkas di dashboard: *"12 kegiatan sudah berberkas tetapi belum bertautan."* | P1 |

### 10.14 Monthly & Weekly Review (`FR-REV`)

| ID | Requirement | Prio |
|---|---|---|
| FR-REV-01 | Halaman Monthly Review dengan pemilih bulan. | P1 |
| FR-REV-02 | Metrik: coverage hari kerja (%), jumlah kegiatan, jumlah bukti, RK terpakai vs tidak, rata-rata progress, jumlah bertautan. | P1 |
| FR-REV-03 | Daftar tindak lanjut yang dapat diklik: tanpa bukti · tanpa capaian · tanpa RK · tanpa Link Bukti Dukung · progress < 100% · masih draft · hari kerja kosong. | P1 |
| FR-REV-04 | **Month-end checklist** dengan status otomatis: semua hari kerja tercatat · semua kegiatan punya RK · semua punya capaian · progress diperbarui · bukti tersedia · **berkas Data Dukung dibuat** · **tautan tersimpan** · siap dipindahkan ke KipApp. | P1 |
| FR-REV-05 | Weekly Review muncul di dashboard pada Jumat–Minggu. | P1 |
| FR-REV-06 | Tombol **Buat Laporan Mingguan / Bulanan** langsung dari halaman review. | P1 |

### 10.15 Reports & Export (`FR-RPT`)

| ID | Requirement | Prio |
|---|---|---|
| FR-RPT-01 | **PDF Data Dukung Laporan Kegiatan** per kegiatan sesuai template §13.1. | P0 |
| FR-RPT-02 | PDF gabungan untuk rentang: harian, mingguan, bulanan, custom. | P0 |
| FR-RPT-03 | Bukti gambar tampil sebagai preview; file non-gambar sebagai daftar referensi; tautan sebagai URL. | P0 |
| FR-RPT-04 | Bukti banyak dilanjutkan ke halaman berikutnya secara rapi; dilarang ada gambar terpotong. | P0 |
| FR-RPT-05 | Export Excel §13.2 dengan header dibekukan, auto-filter, lebar kolom disesuaikan. | P0 |
| FR-RPT-06 | Export CSV (UTF-8 BOM) dan JSON. | P0 |
| FR-RPT-07 | Printable HTML dengan `@media print` yang benar. | P1 |
| FR-RPT-08 | **Evidence Pack** ZIP sesuai §13.3. | P1 |
| FR-RPT-09 | Generator tidak memblokir UI; tampilkan progress untuk > 20 kegiatan. | P1 |
| FR-RPT-10 | Nama file baku: `KipLog_<Jenis>_<Periode>_<YYYYMMDD>.<ext>`. | P0 |

### 10.16 Master Data & Backup (`FR-DAT`)

| ID | Requirement | Prio |
|---|---|---|
| FR-DAT-01 | Halaman **My Profile**: nama (dengan gelar), NIP, jabatan, unit kerja, tahun default, email, logo unit. Terisi otomatis pada laporan. | P0 |
| FR-DAT-02 | Onboarding pertama meminta profil dan menawarkan seed 40 RK 2026 (dapat dilewati). | P0 |
| FR-DAT-03 | CRUD Rencana Kinerja lengkap: jenis, kategori, tim/RK Atasan, tag, keywords, warna, favorit, aktif/nonaktif, urutan. | P0 |
| FR-DAT-04 | **Import RK dari CSV** (§10.16.1) dengan pratinjau, validasi per baris, dan laporan error sebelum commit. | P0 |
| FR-DAT-05 | Import RK dari JSON dengan skema sama. | P0 |
| FR-DAT-06 | **Import Excel Pelaksanaan dari KipApp** — KipApp menyediakan Download Excel pada submenu Pelaksanaan. Impor berkas itu untuk merekonsiliasi: tandai kegiatan yang sudah ada di KipApp, dan tampilkan kegiatan yang ada di KipApp tetapi belum ada di KipLog. Pemetaan kolom dilakukan pengguna lewat UI karena format dapat berubah. | P1 |
| FR-DAT-07 | **Export Backup** ke `kiplog-backup-YYYY-MM-DD.json` berisi seluruh entitas + `schemaVersion`. | P0 |
| FR-DAT-08 | **Export Backup Lengkap (ZIP)**: `data.json` + folder `evidence/`. | P1 |
| FR-DAT-09 | **Import Backup** dua mode: **Ganti seluruh data** atau **Gabungkan** (lewati ID duplikat), dengan ringkasan dampak sebelum eksekusi. | P0 |
| FR-DAT-10 | Backup versi skema lebih lama dimigrasi otomatis; versi lebih baru ditolak dengan pesan jelas. | P0 |
| FR-DAT-11 | **Delete All Data** dengan konfirmasi mengetik `HAPUS`. | P0 |
| FR-DAT-12 | Pengaturan hari kerja dan hari libur nasional dapat diedit pengguna. | P0 |

#### 10.16.1 Format CSV import Rencana Kinerja

```csv
id,tahun,jenis,rencana_kinerja,rencana_kinerja_atasan,tim,kategori,tags,keywords,warna,aktif
,2026,Utama,"Terlaksananya Kegiatan Statistik Kesejahteraan Rakyat Sesuai SOP dan Berkualitas","Terselenggaranya Kegiatan Statistik Kesejahteraan Rakyat sesuai SOP dan tepat waktu","Statistik Kesejahteraan Rakyat",Kesra,"SNLIK;Susenas","snlik;susenas;kesra",#2563eb,true
```

`id` kosong → generate baru. `tags`/`keywords` dipisah titik-koma. `aktif` menerima `true/false/1/0/ya/tidak`. Baris tidak valid dilaporkan dengan nomor baris dan alasan; import bersifat all-or-nothing dalam satu transaksi.

---

## 11. STACK TEKNOLOGI (KEPUTUSAN FINAL)

| Kebutuhan | Pilihan | Alasan |
|---|---|---|
| Framework | **React 18 + TypeScript 5 (strict)** | Standar, ekosistem matang |
| Build | **Vite 5** | Cepat, konfigurasi GitHub Pages sederhana |
| Routing | **React Router v6 dengan `HashRouter`** | Menghindari 404 deep-link di GitHub Pages tanpa hack |
| Styling | **Tailwind CSS 3** | Konsisten, kecil setelah purge |
| Komponen | **shadcn/ui** (disalin ke repo) | Kontrol penuh, tanpa vendor lock |
| Ikon | **lucide-react** | Ringan, konsisten |
| Database | **Dexie 4 + dexie-react-hooks** | Reaktivitas otomatis, versioning bawaan |
| State UI | **Zustand** | Ringan; server-state ditangani `useLiveQuery` |
| Form | **react-hook-form + zod + @hookform/resolvers** | Validasi terpusat, tipe aman |
| Tanggal | **date-fns** (locale `id`) | Modular, tree-shakeable |
| Fuzzy search | **Fuse.js** | Memadai untuk 40–500 RK |
| Kalender | **Komponen kustom di atas date-fns** | Grid bulan hanyalah tabel; FullCalendar terlalu berat (~200 KB) dan sulit disesuaikan dengan indikator §10.2 |
| PDF | **pdfmake** | Layout deklaratif, gambar & multi-halaman baik, murni klien |
| Excel | **exceljs** | Styling, freeze pane, auto-filter; sekaligus dapat membaca Excel KipApp (FR-DAT-06) |
| ZIP | **jszip + file-saver** | Standar de facto |
| Chart | **recharts** | Deklaratif, cukup ringan |
| Kompresi gambar | **browser-image-compression** | Menghemat kuota IndexedDB |
| PWA | **vite-plugin-pwa** | Workbox tanpa konfigurasi manual |
| Test | **Vitest + @testing-library/react + fake-indexeddb** | Satu konfigurasi dengan Vite |
| Lint/format | **ESLint + Prettier** | — |

**Dilarang tanpa izin:** Redux, MUI, moment.js, axios, lodash penuh, jQuery, library UI kedua, backend framework apa pun.

### 11.1 Konfigurasi kunci

```ts
// vite.config.ts
export default defineConfig({
  base: '/kiplog-bps/',   // WAJIB sesuai nama repository GitHub Pages
  plugins: [react(), VitePWA({ /* ... */ })],
});
```

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint . --max-warnings 0",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "verify": "npm run typecheck && npm run lint && npm run test && npm run build"
}
```

`npm run verify` harus lulus **tanpa error dan tanpa warning** di setiap akhir fase.

---

## 12. ALGORITMA INTI

### 12.1 Smart RK Matching (`lib/matching/rk-matcher.ts`)

Fungsi murni, dapat diuji, tanpa LLM.

**12.1.1 Normalisasi**
Lowercase → hapus tanda baca → tokenisasi → buang stopword Indonesia (`yang, dan, di, ke, dari, untuk, pada, dengan, melakukan, melaksanakan, kegiatan, terkait, dalam, oleh, atas, sebagai, serta, akan, telah`) → simpan token ≥ 3 karakter.

**12.1.2 Skoring (total 100)**

| Sinyal | Bobot | Perhitungan |
|---|---|---|
| Kecocokan `plan.keywords` | 40 | (jumlah keyword cocok / jumlah keyword) × 40 |
| Kecocokan token dengan nama RK | 20 | Koefisien Dice antar himpunan token |
| Kecocokan tag | 15 | Irisan tag kegiatan dengan tag RK |
| Riwayat penggunaan | 10 | Kesamaan tertinggi dengan deskripsi 50 kegiatan terakhir yang memakai RK itu (Dice ≥ 0,5) |
| Frekuensi & kebaruan | 10 | `log(usageCount+1)` dinormalisasi + bonus jika `lastUsedAt` < 14 hari |
| Kecocokan nama tim / RK Atasan | 5 | Membantu memisahkan RK bermiripan dalam satu tim |

**Penalti ambiguitas:** jika dua RK dalam satu `CONFUSABLE_PLAN_GROUPS` (§5.4) memiliki selisih skor < 8, keduanya tetap ditampilkan berdampingan dengan pembeda yang disorot — **jangan** memilih salah satu secara sewenang-wenang. Kelompok Kehumasan dan BerAKHLAK hampir selalu memicu kondisi ini.

**12.1.3 Aturan keluaran**
- Ambang minimum **35**; di bawah itu tidak ditampilkan.
- Maksimal 3 rekomendasi, terurut menurun.
- Wajib menyertakan `reason: string[]` berisi token/tag pemicu.
- Hanya RK dengan `isActive === true` dan `year` sesuai tahun kegiatan.

**12.1.4 Pembelajaran lokal**
Saat pengguna memilih RK, tambahkan token deskripsi yang belum ada ke `plan.keywords` (maks 50 per RK; buang yang paling jarang). Seluruh pembelajaran tersimpan lokal.

**12.1.5 Uji wajib**
- `"Melakukan input petugas SNLIK 2026 di website provinsi"` → RK #2 (Kesejahteraan Rakyat) di posisi teratas.
- `"Monitoring progres listing SE2026 di Kecamatan Tejakula"` → RK #16 teratas.
- `"Menyusun laporan akhir Desa Cantik Desa Tembok"` → RK #22 teratas.
- `"Posting kegiatan sosialisasi SE2026 di Instagram BPS Buleleng"` → RK #33 dan #31 tampil berdampingan dengan pembeda, bukan satu saja.
- Deskripsi generik seperti `"rapat"` → tidak ada rekomendasi di atas ambang.

### 12.2 Smart Capaian Generator (`lib/matching/achievement-generator.ts`)

**Aturan utama (default, sesuai praktik nyata):**

```
capaian = "Terselesaikannya " + deskripsi
```

Contoh nyata dari berkas Data Dukung yang ada: deskripsi *"Melakukan Input Petugas SNLIK 2026 di Website Provinsi"* menghasilkan capaian *"Terselesaikannya Melakukan Input Petugas SNLIK 2026 di Website Provinsi"* — kata "Melakukan" **dipertahankan**. Konvensi organisasi lebih penting daripada tata bahasa yang lebih halus, dan konsistensi memudahkan penilaian oleh Ketua Tim.

**Varian opsional (ditawarkan sebagai alternatif kedua dan ketiga, bukan default):**

| Pola deskripsi | Alternatif |
|---|---|
| `Melakukan X` | `Terselesaikannya X` |
| `Melaksanakan X` | `Terlaksananya X` |
| `Menyusun X` | `Tersusunnya X` |
| `Membuat X` | `Terbuatnya X` |
| `Menginput X` | `Terinputnya X` |
| `Mengikuti X` | `Terlaksananya keikutsertaan dalam X` |
| `Memeriksa X` | `Terperiksanya X` |
| `Mengolah X` | `Terolahnya X` |

**Penyesuaian progress:** jika `progress < 100`, jangan pernah menghasilkan kalimat yang menyatakan selesai. Gunakan `"Terlaksananya sebagian ..."` atau tambahkan `" (progress N%)"`.

**Akronim** (`SNLIK`, `SE2026`, `OPD`, `PPL`, `PML`, `DTSEN`, `PEKPPP`, `PST`, `LHKPN`, `SPT`, `BMN`, `QG`, `IKI`, `SKP`) tetap huruf besar — daftar di `lib/matching/acronyms.ts`.

### 12.3 Validasi "Ready to Report" (`lib/services/activity-validator.ts`)

```ts
interface ValidationResult {
  isReady: boolean;
  checks: { field: string; label: string; passed: boolean; message?: string }[];
}
```

| Check | Aturan |
|---|---|
| Tanggal | Terisi, valid, tidak lebih dari 1 tahun ke depan |
| Waktu | Keduanya terisi; `endTime > startTime`; durasi 5 menit – 12 jam |
| Rencana Kinerja | `performancePlanId` tidak null dan RK masih ada |
| Deskripsi Kegiatan | ≥ 10 karakter |
| Capaian Hasil Kegiatan | ≥ 10 karakter |
| Progress | Bilangan bulat 0–100 |
| Status Capaian | Sudah ditentukan secara eksplisit (boolean tidak boleh implisit) |
| Bukti Dukung | ≥ 1 evidence, jika `requireEvidenceForReady` |
| **Link Bukti Dukung** | URL valid `http(s)`, jika `requireEvidenceLinkForReady` |
| Periode | `SkpPeriod.isLocked === false` |

Tampilkan sebagai checklist langsung di form (bukan hanya saat submit), dengan tautan ke field yang gagal.

### 12.4 Hari kerja & coverage (`lib/date/workdays.ts`)

```
hariKerja(bulan) = tanggal dengan weekday ∈ settings.workdays
                   DAN tidak ada di settings.holidays
                   DAN <= hari ini   (khusus perhitungan coverage)

hariTerisi       = hari kerja dengan ≥ 1 activity berstatus ≠ 'archived'
coverage         = hariTerisi / hariKerja × 100   (0 jika penyebut 0)
sisaHariBulan    = jumlah hari kerja tersisa hingga akhir bulan
```

Seed hari libur nasional Indonesia tahun berjalan di `src/data/holidays-id.ts`, dengan catatan bahwa daftar wajib diverifikasi pengguna setiap tahun (SKB Libur Nasional terbit tahunan).

---

## 13. SPESIFIKASI OUTPUT

### 13.1 Template PDF — Data Dukung Laporan Kegiatan

Direplikasi dari contoh berkas nyata. A4 portrait, margin 2 cm, font Roboto, ukuran dasar 11 pt.

```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────┐ ☐ Penataan dan Penguatan Organisasi   ☐ Peningkatan Kualitas   ┌────┐ │
│ │ logo │ ☐ Penataan Peraturan Perundang-        Pelayanan Publik        │ ZI │ │
│ │ BPS  │   Undangan                            ☐ Penguatan Pengawasan   │logo│ │
│ │      │ ☐ Penataan Sumber Daya Manusia        ☐ Penguatan Akuntabilitas│    │ │
│ │      │ ☐ Penataan Tata Laksana                 Kinerja                │    │ │
│ │      │                                       ☐ Manajemen Perubahan    │    │ │
│ └──────┘                                                                └────┘ │
├─────────────────────────────────────────────────────────────┤
│                 Data Dukung Laporan Kegiatan                │
├─────────────────┬───────────────────────────────────────────┤
│ Tanggal         │ : 02 Januari 2026 - 02 Januari 2026        │
│ Waktu Kegiatan  │ : 08:00 - 10:30                           │
│ Kegiatan        │ : Melakukan Input Petugas SNLIK 2026 di   │
│                 │   Website Provinsi                        │
│ Capaian         │ : Terselesaikannya Melakukan Input Petugas │
│                 │   SNLIK 2026 di Website Provinsi          │
│ Progress        │ : 100                                     │
│ Rencana Kinerja │ : Terlaksananya Kegiatan Statistik        │
│                 │   Kesejahteraan Rakyat Sesuai SOP dan     │
│                 │   Berkualitas                             │
│ Pelaksana       │ : <nama lengkap dengan gelar>   (tebal)    │
│ NIP             │ : <18 digit>                              │
├─────────────────┴───────────────────────────────────────────┤
│                      Bukti Dukung                           │
│              [preview gambar / daftar berkas]               │
└─────────────────────────────────────────────────────────────┘
```

**Ketentuan yang wajib dipatuhi (diambil dari berkas nyata):**

- **Tanggal ditulis sebagai rentang**: `02 Januari 2026 - 02 Januari 2026`, bukan tanggal tunggal.
- **Progress ditulis tanpa tanda persen**: `100`, bukan `100%`.
- **Waktu Kegiatan boleh `-`** jika jam tidak dicatat.
- **Pelaksana dicetak tebal**, field lain reguler.
- Kop memuat **kotak centang 8 area Reformasi Birokrasi**; yang relevan dicentang sesuai `Activity.rbAreas`. Jika kosong, semua tidak dicentang.
- Bagian **Bukti Dukung** berada dalam bingkai berjudul, berisi tangkapan layar/berkas.
- Label field tetap persis: `Tanggal`, `Waktu Kegiatan`, `Kegiatan`, `Capaian`, `Progress`, `Rencana Kinerja`, `Pelaksana`, `NIP`, `Bukti Dukung`.
- Gambar menjaga rasio aspek, tidak melebihi lebar konten; gambar yang tidak muat dipindah utuh ke halaman berikutnya.
- Logo BPS dan logo Zona Integritas diambil dari aset lokal atau `UserProfile.logoDataUrl`; jika tidak ada, sisakan ruang kosong tanpa merusak tata letak.

### 13.2 Kolom Excel

`Tanggal` · `Hari` · `Jam Mulai` · `Jam Selesai` · `Durasi (menit)` · `Periode SKP` · `Rencana Kinerja` · `Jenis RK` · `Kegiatan` · `Capaian` · `Progress` · `Status Capaian (Capaian SKP)` · `Link Bukti Dukung` · `Status KipLog` · `Jumlah Bukti` · `Nama Bukti` · `Kategori` · `Tag` · `Lokasi` · `Catatan`

Baris pertama dibekukan, auto-filter aktif, lebar kolom disesuaikan, tanggal sebagai date value, Progress sebagai angka bulat.

### 13.3 Struktur Evidence Pack (ZIP)

```
KipLog_EvidencePack_2026-08/
├── README.txt                     # isi + tanggal pembuatan + daftar tautan
├── ringkasan.xlsx
├── laporan-gabungan.pdf
├── daftar-tautan.csv              # tanggal, kegiatan, RK, link bukti dukung
└── 08-Agustus/
    └── RK-02-Statistik-Kesejahteraan-Rakyat/
        ├── 2026-08-02_Input-Petugas-SNLIK/
        │   ├── data-dukung.pdf
        │   └── bukti/
        │       ├── 01_screenshot-website.png
        │       ├── 02_surat-tugas.pdf
        │       └── tautan.txt
        └── 2026-08-05_Monitoring-Susenas/
```

Pengelompokan **per Rencana Kinerja** mengikuti urutan kerja KipApp (§3.3), sehingga folder ini juga dapat diunggah utuh ke Drive dan tiap subfolder ditautkan per kegiatan. Nama folder kegiatan: `YYYY-MM-DD_<slug-maks-40-karakter>`. Karakter tidak valid (`\ / : * ? " < > |`) disanitasi.

---

## 14. DESAIN & UI/UX

### 14.1 Arah desain

Karakter: **bersih, profesional, padat informasi, tenang** — aplikasi produktivitas untuk lingkungan pemerintahan, bukan aplikasi konsumen berwarna-warni.

- Warna netral mendominasi; satu warna aksen primer; warna semantik hanya untuk status.
- Hierarki dibangun lewat ukuran, jarak, dan bobot font — bukan banyak warna.
- Kepadatan informasi tinggi namun lapang; hindari kartu bermargin berlebihan.
- Inspirasi dari aplikasi produktivitas modern dan layanan digital pemerintah, **tanpa meniru identitas visual perusahaan mana pun**.

### 14.2 Design token (`src/styles/theme.css`, sebagai CSS variable)

| Token | Nilai |
|---|---|
| Font | `Inter` (UI), `JetBrains Mono` (angka/kode) |
| Skala teks | 12 / 14 / 16 / 20 / 24 / 32 px |
| Spacing | Kelipatan 4 px |
| Radius | 6 px (kontrol), 10 px (kartu) |
| Primer | Biru netral, mis. `#2563eb` |
| Netral | Skala abu-abu 50–900 |
| Semantik | sukses `#16a34a` · peringatan `#d97706` · bahaya `#dc2626` · info `#0284c7` |
| Shadow | Maksimal 2 level |

Dukung mode terang dan gelap sejak awal melalui CSS variable.

### 14.3 Navigasi

`Dashboard` · `Kalender` · `Kegiatan` · `Evidence Inbox` · `Bukti & Tautan` · `Rencana Kinerja` · `Template` · `KipApp Ready` · `Laporan` · `Monthly Review` · `Backup & Import` · `Pengaturan`

Bottom nav mobile: Dashboard, Kalender, **+ Tambah** (FAB tengah), Evidence, Kegiatan. Sisanya lewat drawer.

### 14.4 Layout dashboard (desktop)

```
┌──────────────────────────────────────────────────────────┐
│ KipLog            [🔍 Cari…  ⌘K]      + Tambah Kegiatan  │
├────────────┬─────────────────────────────────────────────┤
│            │ Selamat pagi, <Nama>                        │
│ Dashboard  │ Agustus 2026 · Periode SKP 2026-08          │
│ Kalender   │ ⏳ 5 hari kerja tersisa untuk bulan ini      │
│ Kegiatan   │ ┌─────────┬─────────┬─────────┬──────────┐  │
│ Evidence ③ │ │Coverage │Kegiatan │ Bukti   │Bertautan │  │
│ Bukti&Link │ │  80%    │   32    │   48    │  20/32   │  │
│ Rencana    │ │ 16/20   │         │         │          │  │
│ Template   │ └─────────┴─────────┴─────────┴──────────┘  │
│ KipApp     │ ┌────────────────────┬────────────────────┐ │
│ Laporan    │ │ Kalender Agustus   │ Perlu Perhatian    │ │
│ Review     │ │  S S R K J S M     │ • 12 belum bertautan│ │
│ Backup     │ │  ● ● ○ ● ● ▫ ▫     │ • 2 tanpa bukti    │ │
│ Pengaturan │ │  ...               │ • 3 dalam proses   │ │
│            │ └────────────────────┴────────────────────┘ │
│            │ Kegiatan Terbaru                            │
└────────────┴─────────────────────────────────────────────┘
```

### 14.5 Activity Card

```
┌──────────────────────────────────────────────┐
│ ● 10:00 – 12:30 · 2j 30m        [Siap Lapor] │
│                                              │
│ Melakukan Input Petugas SNLIK 2026           │
│ di Website Provinsi                          │
│                                              │
│ ▮ Terlaksananya Kegiatan Statistik           │
│   Kesejahteraan Rakyat Sesuai SOP…   [Utama] │
│                                              │
│ ████████████████████ 100    📎 2   🔗 ada     │
│ ✓ Masuk capaian SKP                 #SNLIK   │
│                                              │
│ [Lihat]  [Ubah]  [Duplikat]  [⋯]             │
└──────────────────────────────────────────────┘
```

`▮` berwarna sesuai warna RK. `🔗` menandakan status Link Bukti Dukung; jika belum ada, tampil `🔗 belum` dengan warna peringatan.

### 14.6 KipApp Ready — tata letak berkelompok per RK

```
┌───────────────────────────────────────────────────────────┐
│ Tahun [2026 ▾]   Periode SKP [Agustus 2026 ▾]             │
│ 7 dari 24 kegiatan ditandai · RK 2 dari 9                 │
├───────────────────────────────────────────────────────────┤
│ ▼ Terlaksananya Kegiatan Statistik Kesejahteraan…  3/5 ✓  │
│    [Salin Nama RK]                    [Tandai RK Selesai] │
│   ┌─────────────────────────┬───────────────────────────┐ │
│   │ Data KipLog             │ Siap tempel ke KipApp     │ │
│   ├─────────────────────────┼───────────────────────────┤ │
│   │ 02 Agu · 08:00–10:30    │ Tanggal        [Salin]    │ │
│   │ Input Petugas SNLIK…    │ Jam Mulai      [Salin]    │ │
│   │ Progress 100            │ Jam Selesai    [Salin]    │ │
│   │ 📎 2 bukti · 🔗 ada      │ Deskripsi      [Salin]    │ │
│   │                         │ Progress       [Salin]    │ │
│   │                         │ Capaian        [Salin]    │ │
│   │                         │ Link Bukti     [Salin]    │ │
│   │                         │ Status Capaian [Salin]    │ │
│   │                         │      [Salin Semua]        │ │
│   │            [✓ Tandai sudah diinput ke KipApp]       │ │
│   └─────────────────────────┴───────────────────────────┘ │
│ ▶ Telaksananya Kegiatan Sensus Ekonomi 2026…       0/8    │
└───────────────────────────────────────────────────────────┘
```

### 14.7 Evidence upload

```
┌─────────────────────────────────────────────┐
│              ⬆                              │
│      Tarik bukti dukung ke sini             │
│      atau [Pilih File]  ·  tempel ⌘V        │
│  PNG, JPG, WEBP, PDF, DOC, XLS · maks 10 MB │
└─────────────────────────────────────────────┘
```

Setelah upload, tiap item tampil sebagai kartu berisi thumbnail, nama file, ukuran, dan aksi `[Pratinjau] [Ubah Nama] [Hapus]` dengan handle drag.

### 14.8 Responsif

| Breakpoint | Perilaku |
|---|---|
| ≥ 1280 px | Sidebar terbuka, dashboard 3–4 kolom |
| 768–1279 px | Sidebar menciut jadi ikon, dashboard 2 kolom |
| < 768 px | Bottom nav + FAB, satu kolom, kalender jadi agenda, form jadi bottom sheet |

Target sentuh ≥ 44×44 px. Pada mobile, alur upload foto bukti, tambah kegiatan, lihat kalender, dan ubah kegiatan harus benar-benar nyaman. Gunakan `capture="environment"` pada input file agar kamera langsung terbuka.

### 14.9 Empty state (wajib)

| Konteks | Judul | Aksi |
|---|---|---|
| Tanggal tanpa kegiatan | "Belum ada kegiatan pada tanggal ini." | `+ Tambah Kegiatan` |
| Evidence Inbox kosong | "Semua bukti dukung sudah ditautkan." | `Unggah Bukti` |
| Pencarian nihil | "Tidak ada hasil untuk '<kata kunci>'." | `Hapus filter` |
| Belum ada RK | "Belum ada Rencana Kinerja." | `Import CSV` · `Muat 40 RK 2026` |
| Belum ada template | "Template mempercepat kegiatan rutin." | `Buat Template` |
| Laporan tanpa data | "Tidak ada kegiatan pada periode ini." | `Ubah Periode` |
| Bukti & Tautan kosong | "Semua kegiatan sudah punya Link Bukti Dukung." | `Lihat Laporan` |

---

## 15. NON-FUNCTIONAL REQUIREMENTS

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | Waktu muat awal | < 2 detik |
| NFR-02 | Bundle JS awal (gzip) | < 300 KB (lazy-load pdfmake, exceljs, jszip) |
| NFR-03 | Render kalender bulan dengan 100 kegiatan | < 200 ms |
| NFR-04 | Hasil global search untuk 2.000 kegiatan | < 300 ms |
| NFR-05 | Simpan kegiatan (tanpa file) | < 100 ms |
| NFR-06 | Generate PDF 30 kegiatan bergambar | < 10 detik + indikator progress |
| NFR-07 | Skala data nyaman | 5.000 kegiatan · 15.000 evidence · 500 RK |
| NFR-08 | Browser | Chrome/Edge ≥ 110, Firefox ≥ 110, Safari ≥ 16.4 |
| NFR-09 | Aksesibilitas | WCAG 2.1 AA |
| NFR-10 | Lighthouse (Performance / A11y / Best Practices) | ≥ 90 |
| NFR-11 | Permintaan jaringan keluar saat penggunaan normal | 0 (diverifikasi di DevTools) |

### 15.1 Aksesibilitas

Navigasi keyboard penuh, urutan fokus logis, ring fokus terlihat · `aria-label` pada semua ikon-tombol · `<label>` terkait pada semua input · error via `aria-live="polite"` + `aria-describedby` · kontras ≥ 4,5:1 (teks besar ≥ 3:1) · modal dengan focus trap, `Esc` menutup, fokus kembali ke pemicu · status disampaikan lewat teks/ikon, bukan hanya warna · hormati `prefers-reduced-motion`.

---

## 16. STORAGE, PWA, KEAMANAN & PRIVASI

### 16.1 Storage

| ID | Requirement |
|---|---|
| **ST-01** | Data terstruktur dan file evidence di **IndexedDB via Dexie**; file sebagai `Blob`. |
| **ST-02** | `localStorage` hanya untuk preferensi ringan (< 5 KB). **Dilarang** menyimpan file atau data domain. |
| **ST-03** | Panggil `navigator.storage.persist()` saat onboarding dengan penjelasan manfaatnya. |
| **ST-04** | Pantau `navigator.storage.estimate()`; peringatan pada 80%, peringatan keras pada 95%. |
| **ST-05** | Object URL dari Blob **wajib** di-`revokeObjectURL` saat unmount. |
| **ST-06** | Ingatkan backup jika belum pernah backup dalam 14 hari. |
| **ST-07** | Rancang interface repository agar implementasi cloud dapat ditambahkan tanpa mengubah lapisan atas — tanpa menulis kode cloud pada MVP. |

### 16.2 PWA

| ID | Requirement | Prio |
|---|---|---|
| PWA-01 | Manifest lengkap: nama, ikon 192/512 (+ maskable), theme color, `display: standalone`, `start_url` sesuai base path. | P1 |
| PWA-02 | Service worker via `vite-plugin-pwa` dengan precache app shell. | P1 |
| PWA-03 | Aplikasi berfungsi **penuh secara offline**. | P1 |
| PWA-04 | Prompt update: *"Versi baru tersedia. Muat ulang?"* | P1 |
| PWA-05 | Dapat di-install di desktop dan mobile. | P1 |

### 16.3 Keamanan

| ID | Requirement |
|---|---|
| SEC-01 | Tidak ada field, penyimpanan, atau transmisi kredensial community/KipApp. |
| SEC-02 | Tidak ada permintaan jaringan ke domain pihak ketiga saat runtime; font dan aset di-bundle lokal. |
| SEC-03 | Tidak ada analytics, telemetry, error-reporting eksternal, atau A/B testing. |
| SEC-04 | Konten pengguna dirender sebagai teks. **Dilarang** `dangerouslySetInnerHTML` pada data pengguna. |
| SEC-05 | URL divalidasi hanya `https://` dan `http://`. Tolak `javascript:`, `data:`, `file:`. |
| SEC-06 | Tautan eksternal memakai `rel="noopener noreferrer"`. |
| SEC-07 | Nama file pengguna disanitasi sebelum masuk ZIP atau unduhan. |
| SEC-08 | Sertakan `Content-Security-Policy` via meta tag yang melarang skrip eksternal. |
| SEC-09 | **Export Data**, **Import Data**, dan **Delete All Data** wajib benar-benar berfungsi. |

### 16.4 Privasi

Data KipLog dapat memuat NIP, dokumen internal, tangkapan layar sistem internal, dan data kegiatan BPS. Karena itu:

- Onboarding dan Pengaturan wajib menjelaskan: **seluruh data tersimpan di browser perangkat ini saja, tidak dikirim ke mana pun**.
- Jelaskan risiko nyata: membersihkan data browser menghapus data KipLog; perangkat bersama berarti data dapat diakses orang lain; mode penyamaran tidak menyimpan data.
- **Peringatan khusus tautan**: berkas Data Dukung yang diunggah ke Google Drive dan ditautkan di KipApp menjadi dapat diakses siapa pun yang memiliki tautan tersebut. Ingatkan pengguna memeriksa pengaturan berbagi folder sebelum menempelkan tautan, terutama jika bukti memuat data responden.
- Buat `docs/PRIVACY.md` dan tautkan dari README.

---

## 17. ERROR HANDLING & EDGE CASE

### 17.1 Pesan error (gunakan teks ini)

| Situasi | Pesan |
|---|---|
| Upload gagal | "Gagal mengunggah bukti dukung. File asli masih ada di perangkat Anda. Coba lagi." |
| File terlalu besar | "Ukuran file <nama> adalah <x> MB, melebihi batas <n> MB. Kompres file atau tambahkan sebagai tautan." |
| Tipe file tidak didukung | "Tipe file <ext> belum didukung. Gunakan PNG, JPG, WEBP, PDF, DOC/DOCX, atau XLS/XLSX." |
| Penyimpanan hampir penuh | "Penyimpanan lokal terpakai <x>%. Lakukan Backup Data lalu hapus bukti dukung lama." |
| Hapus kegiatan berisi bukti | "Kegiatan ini memiliki <n> bukti dukung. Hapus sekaligus, atau kembalikan bukti ke Evidence Inbox?" |
| Hapus RK yang dipakai | "Rencana Kinerja ini digunakan oleh <n> kegiatan dan tidak dapat dihapus. Nonaktifkan saja?" |
| URL tidak valid | "Link bukti dukung harus diawali https:// atau http://." |
| Edit kegiatan terkunci | "Kegiatan ini sudah dikirim untuk dinilai. Di KipApp, data yang sudah dikirim tidak dapat diedit." |
| Periode terkunci | "Periode SKP ini sudah Anda tandai terkunci. Buka kunci di Pengaturan Periode jika ini keliru." |
| Import backup versi lebih baru | "Berkas cadangan ini dibuat oleh KipLog versi lebih baru. Perbarui aplikasi terlebih dahulu." |
| Import CSV bermasalah | "<n> baris tidak dapat diproses. Periksa detail di bawah. Tidak ada data yang diubah." |
| Import Excel KipApp tidak dikenali | "Struktur kolom tidak dikenali. Petakan kolom secara manual pada langkah berikutnya." |
| Generate PDF gagal | "Gagal membuat PDF. Coba periode lebih pendek atau kurangi bukti bergambar." |
| IndexedDB tidak tersedia | "Browser ini memblokir penyimpanan lokal. KipLog tidak dapat berjalan di mode penyamaran atau dengan penyimpanan dinonaktifkan." |

Setiap pesan harus menjelaskan **apa yang terjadi**, **apakah data aman**, dan **langkah berikutnya**. Jangan menampilkan error mentah dari library.

### 17.2 Edge case

| Kasus | Perilaku |
|---|---|
| Kegiatan melewati tengah malam | Tolak; sarankan memecah menjadi dua kegiatan |
| `endTime` = `startTime` | Tolak; durasi minimum 5 menit |
| Kegiatan tumpang tindih | Peringatan lembut, bukan blokir |
| Kegiatan di weekend/libur | Diizinkan; ditandai; tidak menambah penyebut coverage |
| Deskripsi > 1.000 karakter | Diizinkan; UI truncate; PDF membungkus teks |
| Nama RK sangat panjang (lihat RK #30) | Truncate 2 baris + tooltip; PDF menampilkan penuh |
| Pergantian tahun | Filter RK berdasarkan `year`; peringatkan jika kegiatan memakai RK tahun berbeda |
| Perubahan zona waktu perangkat | Tanggal berbasis string tidak terpengaruh (§9.1) |
| Evidence yatim | Kembalikan otomatis ke Evidence Inbox |
| Import backup dengan ID duplikat | Mode Gabungkan melewatinya; tampilkan ringkasan yang dilewati |
| Kuota IndexedDB habis saat upload | Batalkan transaksi utuh; jangan tinggalkan record parsial |
| Beberapa tab terbuka | Dexie `liveQuery` menyinkronkan; hindari cache global yang tidak sadar tab |
| RK bernama nyaris sama — 8 kelompok, lihat §5.4 | **Wajib** tampilkan Rencana Kinerja Atasan + tim sebagai pembeda di combobox, panel rekomendasi, dan Copy Mode. Uji khusus untuk kelompok Kehumasan (28/31/33/34) dan BerAKHLAK (29/35/37/38) yang keempatnya berbagi RK Atasan identik. |

---

## 18. TESTING & QA

| ID | Requirement |
|---|---|
| QA-01 | Unit test wajib untuk seluruh `lib/` — matcher, generator capaian, validator, hari kerja/coverage, formatter laporan, parser CSV. Cakupan ≥ 80% pada folder ini. |
| QA-02 | Uji repository dengan `fake-indexeddb`, termasuk jalur migrasi skema. |
| QA-03 | Uji komponen untuk form kegiatan, RK combobox, upload evidence, dan Copy Mode. |
| QA-04 | Uji round-trip backup: export → wipe → import → data identik. |
| QA-05 | Uji regresi: PDF dan Excel dihasilkan dari fixture 30 kegiatan tanpa error, dan PDF memuat seluruh field §13.1. |
| QA-06 | Setiap perbaikan bug menambahkan test yang gagal sebelum perbaikan. |
| QA-07 | Checklist manual per fase: Chrome desktop + Safari iOS, mode offline, data kosong. |
| QA-08 | Uji khusus §12.1.5 (empat kasus rekomendasi RK) wajib lulus sebelum Fase 4 dinyatakan selesai. |

---

## 19. DEPLOYMENT

| ID | Requirement |
|---|---|
| DEP-01 | GitHub Actions `.github/workflows/deploy.yml`: build pada push ke `main`, deploy via `actions/deploy-pages`. |
| DEP-02 | `base` di `vite.config.ts` sama persis dengan nama repository. |
| DEP-03 | Gunakan `HashRouter` agar deep link berfungsi tanpa konfigurasi server. |
| DEP-04 | Sertakan `.nojekyll` di `public/`. |
| DEP-05 | Build gagal jika `typecheck`, `lint`, atau `test` gagal. |
| DEP-06 | Tampilkan nomor versi build di Pengaturan. |

---

## 20. RENCANA IMPLEMENTASI BERTAHAP

**Aturan gerbang:** setiap fase berakhir dengan `npm run verify` lulus bersih, aplikasi dapat dijalankan, laporan singkat, lalu **BERHENTI dan tunggu persetujuan**.

### Fase 1 — Fondasi
Scaffold Vite + React + TS strict · Tailwind + shadcn/ui + token tema · HashRouter + AppShell · skema Zod + tipe · Dexie v1 + repository · seeding **40 RK 2026** · Pengaturan & My Profile · onboarding · ESLint/Prettier/Vitest · deploy pertama.
**DoD:** aplikasi ter-deploy; profil tersimpan; 40 RK tampil dari IndexedDB dengan wording verbatim (termasuk tiga salah ketik sumber), dikelompokkan per tim kerja; refresh tidak menghilangkan data.

### Fase 2 — Kegiatan & Kalender
Kalender bulan/minggu/hari dengan indikator · Day Panel · form kegiatan **berurutan seperti KipApp** (termasuk Status Capaian dan Link Bukti Dukung) · RK combobox fuzzy · progress & capaian · autosave draft · daftar Kegiatan · Activity Card · Duplicate · perhitungan hari kerja & coverage · penguncian periode/`sentForReview`.
**DoD:** AC-01, AC-02, AC-03, AC-07, AC-20 terpenuhi; test §12.4 lulus.

### Fase 3 — Bukti Dukung
Upload drag/drop/paste · kompresi & thumbnail · Evidence Gallery · preview modal · rename/caption/kategori/urutkan/hapus · link evidence · pemantauan kuota · Evidence Inbox + penautan.
**DoD:** AC-05, AC-06, AC-21 terpenuhi; 20 gambar diunggah tanpa kebocoran memori.

### Fase 4 — Produktivitas
Template CRUD + terapkan + simpan-sebagai-template · sistem tag · global search `⌘K` · panel filter + chip · Smart RK Recommendation (§12.1) · Smart Capaian Generator (§12.2) · validator Ready to Report (§12.3) · Duplicate ke rentang tanggal.
**DoD:** AC-04, AC-08, AC-09 terpenuhi; QA-08 lulus.

### Fase 5 — Pelaporan & Tautan
PDF Data Dukung §13.1 (termasuk kop RB dan format tanggal rentang) · PDF rentang · Excel · CSV · JSON · **Link Registry §10.13** · Evidence Pack ZIP berkelompok per RK · backup export/import · Delete All Data.
**DoD:** AC-11 s.d. AC-15, AC-25, AC-26 terpenuhi; round-trip backup lulus.

### Fase 6 — KipApp Ready & Review
Halaman KipApp Ready berkelompok per RK · Copy Mode dua kolom berurutan seperti form KipApp · penandaan `reported` · `PlanPeriodStatus` · penguncian periode · Dashboard lengkap · Monthly & Weekly Review · month-end checklist · alert hitung mundur.
**DoD:** AC-10, AC-22, AC-27 terpenuhi; seluruh angka ringkasan konsisten dengan data mentah.

### Fase 7 — Penyempurnaan
Audit responsif · PWA · audit aksesibilitas · seluruh empty state dan pesan error · lazy-load library berat · optimasi performa · import Excel KipApp (FR-DAT-06) · README dan `docs/`.
**DoD:** Lighthouse ≥ 90; NFR-01 s.d. NFR-11 terverifikasi.

**Di luar MVP:** AI Assistant, OCR bukti, input suara, sinkronisasi cloud/Supabase, multi-perangkat, multi-user.

---

## 21. DELIVERABLE 0 — GERBANG DESAIN (KERJAKAN PERTAMA, LALU BERHENTI)

Hasilkan dalam satu respons. Gunakan Mermaid untuk 1–4 dan wireframe ASCII untuk 6–11.

1. **Diagram arsitektur** — lapisan dan aliran data.
2. **ERD model data** — seluruh entitas §9.2 termasuk `SkpPeriod` dan `PlanPeriodStatus`.
3. **Diagram alur pengguna** — alur harian, alur Evidence Inbox, **alur Data Dukung → unggah → tautan → KipApp**, alur akhir bulan.
4. **Sitemap** — seluruh rute.
5. **Konfirmasi keputusan teknis** §11 dan daftar asumsi yang perlu ditegaskan.
6. **Wireframe Dashboard** (desktop + mobile).
7. **Wireframe Kalender** (month view dengan indikator).
8. **Wireframe Form Tambah Kegiatan** — urutan field persis KipApp, termasuk panel rekomendasi RK.
9. **Wireframe Evidence Inbox**.
10. **Wireframe KipApp Ready** — berkelompok per Rencana Kinerja.
11. **Wireframe Bukti & Tautan** (Kanban empat kolom).
12. **Roadmap implementasi** — rincian tugas per fase dengan estimasi.
13. **Daftar pertanyaan terbuka**.

Setelah itu **BERHENTI**.

---

## 22. LAMPIRAN

### 22.1 Data contoh (gunakan placeholder di repository)

Fixture dan seed demo **wajib memakai placeholder**. Data asli diisi pengguna lewat My Profile saat runtime, dan tidak pernah masuk ke repository.

```
Pelaksana : [Nama Pegawai, Gelar]
NIP       : [18 digit NIP]
Jabatan   : [Jabatan]
Unit Kerja: BPS Kabupaten [Nama Kabupaten]
```

Fixture kegiatan (struktur mengikuti berkas Data Dukung nyata):

```
Tanggal              : 2026-01-02
Waktu Kegiatan       : 08:00 – 10:30
Deskripsi Kegiatan   : Melakukan Input Petugas SNLIK 2026 di Website Provinsi
Capaian              : Terselesaikannya Melakukan Input Petugas SNLIK 2026 di Website Provinsi
Progress             : 100
Status Capaian       : Masuk capaian SKP
Rencana Kinerja      : Terlaksananya Kegiatan Statistik Kesejahteraan Rakyat Sesuai SOP dan Berkualitas
Link Bukti Dukung    : https://drive.google.com/…  (placeholder)
Bukti Dukung         : screenshot-usulan-petugas-snlik.png
```

Seed template:

```
Monitoring Progres PPL   → RK #16 (SE2026)          | progress default 25
Pembinaan Desa Cantik    → RK #22 (Desa Cantik)     | progress default 50
Pembinaan Sektoral OPD   → RK #26                   | progress default 100
Penyusunan Laporan       → RK #32 (Laporan Kinerja) | progress default 50
Kegiatan Kehumasan       → RK #34                   | progress default 100
Rapat Koordinasi         → RK kosong                | progress default 100
```

### 22.2 Matriks keterlacakan Acceptance Criteria

| AC | Kriteria | FR / bagian terkait | Fase |
|---|---|---|---|
| AC-01 | Membuka kalender dan melihat kegiatan per tanggal | FR-CAL-01…04 | 2 |
| AC-02 | Menambahkan kegiatan dalam < 1 menit | FR-ACT-01…09, FR-RKS-01 | 2 |
| AC-03 | Memilih RK melalui pencarian dari 40 item | FR-RKS-01…06 | 2 |
| AC-04 | Memperoleh rekomendasi RK dari deskripsi | FR-SRK-01…07, §12.1 | 4 |
| AC-05 | Mengunggah minimal satu bukti dukung | FR-EVD-02…04 | 3 |
| AC-06 | Melihat pratinjau bukti dukung | FR-EVD-05, FR-EVD-06 | 3 |
| AC-07 | Menduplikasi kegiatan | FR-ACT-11 | 2 |
| AC-08 | Membuat dan memakai template | FR-TPL-01…03 | 4 |
| AC-09 | Mencari kegiatan berdasarkan kata kunci | FR-SCH-01…03 | 4 |
| AC-10 | Mengetahui tanggal yang belum ada catatannya | FR-CAL-03, FR-DSH-02, FR-REV-03 | 6 |
| AC-11 | Menghasilkan PDF Data Dukung Laporan Kegiatan | FR-RPT-01…04 | 5 |
| AC-12 | PDF memuat seluruh field dan format §13.1 (tanggal rentang, progress tanpa persen, kop RB) | §13.1 | 5 |
| AC-13 | Menghasilkan Excel | FR-RPT-05, §13.2 | 5 |
| AC-14 | Membuat backup seluruh data | FR-DAT-07, FR-DAT-08 | 5 |
| AC-15 | Melakukan restore backup | FR-DAT-09, FR-DAT-10 | 5 |
| AC-16 | Berjalan tanpa backend | CON-05, ST-01 | 1 |
| AC-17 | Tidak menyimpan kredensial KipApp | CON-04, SEC-01 | semua |
| AC-18 | Ter-deploy ke GitHub Pages | DEP-01…04 | 1 |
| AC-19 | Berfungsi penuh secara offline | PWA-03 | 7 |
| AC-20 | Coverage hari kerja benar (weekend & libur dikecualikan) | §12.4, FR-CAL-05 | 2 |
| AC-21 | Evidence Inbox mencegah bukti tercecer | FR-INB-01…07 | 3 |
| AC-22 | Copy Mode dikelompokkan per RK sesuai urutan kerja KipApp | FR-KAR-02…06, §3.3 | 6 |
| AC-23 | Data bertahan setelah browser ditutup dan dibuka kembali | ST-01, ST-03 | 1 |
| AC-24 | Lolos WCAG 2.1 AA pada alur utama | NFR-09, §15.1 | 7 |
| AC-25 | Setiap kegiatan dapat menyimpan Link Bukti Dukung yang siap ditempel ke KipApp | FR-ACT-08, FR-LNK-01…05, §3.1 | 5 |
| AC-26 | Aplikasi dapat menghasilkan berkas Data Dukung untuk banyak kegiatan sekaligus | FR-LNK-02, FR-RPT-02 | 5 |
| AC-27 | Kegiatan dan periode yang sudah dikirim ke KipApp bersifat read-only dengan penjelasan | FR-ACT-15, FR-KAR-12, §9.4 | 6 |
| AC-28 | Wording 40 RK identik dengan sumber, termasuk salah ketik aslinya | DR-01, DR-02 | 1 |
| AC-29 | RK yang mudah tertukar dapat dibedakan tanpa membuka dokumen sumber | FR-RKS-06, FR-RKS-07, §5.4 | 2 |
| AC-30 | Tidak ada nama pegawai lain yang ter-commit ke repository publik | DR-08 | 1 |

### 22.3 Standar kualitas kode

**Wajib:** TypeScript strict (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`) · komponen kecil dan reusable · pemisahan tanggung jawab antar lapisan · tipe diturunkan dari Zod · custom hook untuk logika berulang · validasi terpusat · error boundary per rute · unit test untuk seluruh business logic · nama variabel deskriptif dalam bahasa Inggris.

**Hindari:** komponen raksasa · data hardcoded tersebar · logika terduplikasi · business logic inline di JSX · `any` · `useEffect` yang seharusnya nilai turunan · dependency tidak perlu.

### 22.4 Isi README.md

Gambaran produk dan masalah yang diselesaikan · **penjelasan bahwa KipApp meminta tautan bukti dukung, dan bagaimana KipLog membantu menyiapkannya** · daftar fitur dengan tangkapan layar · ringkasan arsitektur · instalasi dan pengembangan lokal · build dan deploy ke GitHub Pages · penyimpanan data dan implikasinya · panduan backup/restore · pernyataan privasi termasuk peringatan berbagi tautan Drive · **batasan yang jujur** (tidak terintegrasi dengan KipApp, data hanya di satu browser, tidak ada sinkronisasi multi-perangkat, tidak mengunggah ke Drive) · roadmap · lisensi.

---

## 23. PRINSIP PENUTUP

Jangan membangun aplikasi yang sekadar memindahkan formulir KipApp ke halaman web lain. Bangun aplikasi yang **menyelesaikan pekerjaan sebelum pengguna membuka KipApp**.

Alur ideal yang dituju:

> Pekerjaan dikerjakan → bukti langsung tersimpan → kegiatan tercatat → RK terpilih → progress diperbarui → berkas Data Dukung terbentuk → diunggah dan tautannya tersimpan → pengguna tinggal menempelkan delapan field ke KipApp, satu Rencana Kinerja demi satu Rencana Kinerja.

Dengan begitu KipLog menjadi:

> **Single source of truth untuk catatan aktivitas dan bukti dukung pribadi pegawai.**

Ukuran keberhasilan sesungguhnya bukan jumlah fitur yang selesai, melainkan: **pengguna berhenti takut membuka KipApp di akhir bulan.**
