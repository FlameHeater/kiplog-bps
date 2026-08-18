# KipLog BPS

Jurnal kerja digital pribadi untuk pegawai BPS. KipLog membantu mencatat
kegiatan kerja harian, mengelola bukti dukung, menghubungkannya dengan
Rencana Kinerja, dan menghasilkan **berkas Data Dukung siap unggah beserta
tautannya** untuk diinput ke KipApp.

> Catat pekerjaan sekali → kelola bukti dukung → hasilkan berkas Data Dukung
> → simpan tautannya → tempel ke KipApp.

## Kenapa ini penting

KipApp meminta **tautan** (URL) sebagai bukti dukung, bukan unggahan file
langsung — field ke-7 pada dialog "Add Capaian Kegiatan Perhari" berlabel
"Data Dukung" dan hanya menerima teks. Artinya bukti harus dirapikan menjadi
satu berkas, diunggah ke
Google Drive, lalu tautannya disalin kembali ke KipApp. KipLog menyiapkan
rantai kerja ini: mengumpulkan bukti mentah, menghasilkan PDF "Data Dukung
Laporan Kegiatan" siap unggah, dan menyediakan tempat untuk menyimpan
tautan setelah Anda mengunggahnya sendiri.

KipLog **tidak terintegrasi** dengan KipApp — tidak ada API, tidak ada
login otomatis, tidak ada data yang dikirim ke KipApp. Pemindahan tetap terjadi
di browser Anda sendiri, entah dengan menempel manual atau lewat bookmarklet
autofill (lihat "Autofill ke KipApp"); penyimpanannya tetap Anda yang menekan.

## Status

Seluruh 7 fase implementasi selesai (lihat [PRD §20](PRD-KipLog-BPS-v3.1.md)
untuk rincian per fase), ditambah login Google dan sinkronisasi Google Drive
yang diminta setelah fase terakhir (lihat "Login & Sinkronisasi" di bawah).
`npm run verify` lulus bersih (typecheck + lint + test + build). Lighthouse:
Accessibility 100, Best Practices 100 di semua mode; Performance 99 (desktop)
/ 86–87 (mobile default, throttled) — lihat
[docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) untuk rincian gap performa mobile
yang masih ada dan alasannya. Sudah di-deploy ke GitHub Pages:
<https://flameheater.github.io/kiplog-bps/>.

## Arsitektur (ringkas)

Client-only, tanpa backend sendiri. React 18 + TypeScript strict, Vite 5,
Tailwind + shadcn/ui, Dexie (IndexedDB) untuk penyimpanan lokal, PWA
(installable + offline lewat `vite-plugin-pwa`). Satu-satunya layanan
eksternal yang dihubungi adalah Google — untuk login dan untuk Drive sebagai
penyimpan sinkronisasi (lihat "Login & Sinkronisasi"). Detail lengkap di
[docs/DELIVERABLE-0.md](docs/DELIVERABLE-0.md) §1–§4.

## Fitur

- **Kegiatan**: form kegiatan harian dengan field persis urutan KipApp, RK combobox dengan fuzzy search, rekomendasi RK otomatis, generator draf capaian.
- **Bukti Dukung**: unggah/kompresi gambar, tautan eksternal, galeri per kegiatan, Evidence Inbox untuk bukti yang belum ditautkan.
- **Kalender & Dashboard**: tampilan bulan/minggu/hari (agenda list di mobile), ringkasan capaian SKP, alert & nudge.
- **Laporan**: PDF "Data Dukung Laporan Kegiatan", Excel, CSV/JSON, Evidence Pack ZIP.
- **KipApp Ready**: mode salin dua kolom untuk memindahkan data ke KipApp, dengan penguncian periode, plus bookmarklet autofill (lihat di bawah).
- **Backup & Import**: backup JSON/ZIP, restore (gabung/ganti), hapus semua data, dan rekonsiliasi Excel Pelaksanaan dari KipApp (lihat kolom mana yang sudah/belum tercatat di KipLog).
- **Rencana Kinerja & Template**: 40 RK 2026 (seed), template kegiatan yang bisa dipakai ulang.
- **Login & Sinkronisasi**: akses dibatasi ke akun Google yang diizinkan, data disinkronkan antar perangkat lewat satu folder Google Drive bersama.

## Login & Sinkronisasi

Aplikasi terkunci di balik login Google. Hanya email yang terdaftar di
`VITE_ALLOWED_EMAIL` (boleh lebih dari satu, dipisah koma) yang bisa masuk;
akun lain berhenti di layar "Akun ini tidak diizinkan" tanpa data apa pun
ditampilkan. Proteksinya dua lapis: consent screen Google Cloud dibiarkan
berstatus *Testing* dengan hanya akun-akun itu sebagai test user, sehingga
Google sendiri menolak akun lain sebelum kode aplikasi berjalan; lalu email
pemilik token diverifikasi ulang di aplikasi lewat endpoint `userinfo` Google.

Setelah login pertama berhasil, hasil verifikasi (email + waktu) di-cache di
`localStorage` supaya aplikasi tetap bisa dibuka **offline** — mewajibkan
round-trip ke Google setiap kali dibuka akan mengunci pengguna dari data
offline miliknya sendiri. Perangkat atau browser baru tetap wajib login
online sekali.

Sinkronisasi memakai satu folder Google Drive biasa (`VITE_SYNC_FOLDER_ID`)
yang dibagikan (akses Editor) ke semua akun yang diizinkan — bukan folder
tersembunyi `appDataFolder`, karena folder itu privat per akun Google dan
tidak bisa dibagi sama sekali. Karena itu scope OAuth yang diminta adalah
`drive` penuh, yang membuat consent screen menampilkan peringatan "aplikasi
belum diverifikasi"; ini normal untuk aplikasi berstatus Testing, bukan
tanda kesalahan.

Isi folder sinkron bisa dibuka langsung di Drive: `kiplog-data.json`
(seluruh data delapan tabel) dan subfolder `evidence/` berisi berkas bukti
dukung asli per item. Aplikasi menarik data dari Drive saat dibuka, lalu
mendorong perubahan lokal 8 detik setelah perubahan terakhir, saat tab
disembunyikan, dan lewat tombol **Sinkron Sekarang** di Pengaturan >
Sinkronisasi.

Modelnya **snapshot terakhir menang**, bukan penggabungan per-record:
mengedit di dua perangkat pada waktu yang berdekatan akan membuat perubahan
dari perangkat yang mendorong lebih dulu hilang. Ini memadai untuk satu
orang yang berpindah perangkat, bukan untuk beberapa orang mengedit
bersamaan.

Penyiapan di sisi Google (project Google Cloud, Drive API, consent screen,
OAuth Client ID, folder Drive bersama) harus dilakukan manual — langkah
lengkapnya ada di [.env.example](.env.example).

## Autofill ke KipApp

Halaman KipApp Ready menyediakan bookmarklet yang mengisi form **Add Capaian
Kegiatan Perhari** di KipApp dari data KipLog, sehingga sembilan field tidak
perlu ditempel satu per satu. Alurnya: buka form Add di KipApp → tekan "Salin
untuk Autofill" di KipLog → klik bookmarklet di tab KipApp → tempel → "Isi
Form" → **Anda** yang menekan Save.

Untuk sebulan sekaligus, tekan **"Salin sebulan untuk Autofill"**. KipApp hanya
menerima satu kegiatan per dialog, jadi yang diringkas adalah penyiapannya:
sekali salin, lalu panel bookmarklet menampilkan kegiatan ke berapa dari
berapa dan hari ke berapa, dengan tombol **Berikutnya** dan **Lompat ke
tanggal berikutnya**. Posisi antrean diingat, jadi tetap lanjut walau halaman
dimuat ulang. Kegiatan yang belum siap kirim dikeluarkan dari antrean beserta
alasannya, bukan disertakan diam-diam.

Label, urutan, dan jenis kontrol field diambil dari tangkapan layar dialog itu
di `Panduan KipApp - Pengguna V.3.1.pdf` halaman 66, lalu dikoreksi dua kali:
terhadap tangkapan layar form sungguhan KipApp v2.0.4 (2026), dan terhadap
hasil percobaan langsung pengguna. Panduan 2022 sudah tidak menggambarkan
formnya: ada dua checkbox baru, Jam Mulai/Jam Selesai tidak ada di halaman
sampai "Gunakan jam" dicentang, dan yang terpenting **Rencana Kinerja serta
Tanggal bukan kontrol HTML biasa** melainkan komponen popup — RK harus diklik
opsinya setelah dicari, Tanggal diisi lewat kotak isian di dalam kalendernya.
Karena popup itu baru muncul setelah diklik, pengisian berjalan bertahap dan
perlu beberapa detik.

Batasnya, dan ini disengaja:

- Skrip menolak berjalan di host selain `kipapp.bps.go.id` dan `webapps.bps.go.id` (KipApp dapat diakses lewat keduanya).
- Skrip hanya **menulis** ke field — tidak membaca data KipApp dan tidak mengirim apa pun ke mana pun.
- Skrip **tidak menekan Save**. Pencocokan bertumpu pada kerangka Ant Design yang dipakai KipApp, dan tata letak itu bisa berubah tanpa pemberitahuan; karena itu pemeriksaan akhir tetap milik pengguna. Setiap field dibaca ulang setelah diisi, jadi laporan "Terisi" berarti sudah diperiksa, bukan sekadar dicoba.
- Field yang gagal ditemukan dilaporkan, tidak didiamkan.
- Tidak ada kredensial KipApp yang diminta atau disimpan. Tidak ada scraping, tidak ada headless browser, tidak ada login otomatis.
- Kegiatan yang sudah dikirim untuk dinilai ditolak, karena KipApp sendiri tidak mengizinkan perubahan setelah itu.

Ini pengecualian sempit yang diminta pemilik proyek terhadap PRD CON-03 —
lihat CON-03a di PRD dan entri terkait di
[docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md).

## Instalasi & Pengembangan Lokal

Salin `.env.example` ke `.env.local` dan isi `VITE_GOOGLE_CLIENT_ID`,
`VITE_ALLOWED_EMAIL`, dan `VITE_SYNC_FOLDER_ID` lebih dulu. Tanpa itu
aplikasi gagal-aman: terkunci total di layar "Akun ini tidak diizinkan".

```bash
npm install
npm run dev        # dev server
npm run verify      # typecheck + lint + test + build, harus lulus bersih
```

## Build & Deploy ke GitHub Pages

`vite.config.ts` `base` harus sama persis dengan nama repository GitHub
(saat ini `/kiplog-bps/` — ubah jika nama repo berbeda). Deploy otomatis
lewat `.github/workflows/deploy.yml` saat push ke `main`; hasilnya tayang di
<https://flameheater.github.io/kiplog-bps/>. Ketiga variabel `VITE_*` di atas
harus diisi sebagai GitHub Actions repo secret (Settings > Secrets and
variables > Actions) agar build produksi mendapatkannya — variabel itu tidak
ikut ter-commit.

## Penyimpanan Data & Implikasinya

**Penyimpanan utama tetap di browser perangkat ini (IndexedDB)** — aplikasi
bekerja penuh tanpa internet. Salinan data juga dikirim ke **folder Google
Drive milik Anda sendiri** untuk sinkronisasi antar perangkat; tidak ada
server pihak lain yang menerima data KipLog. Konsekuensinya:

- Membersihkan data browser (cache/storage) akan **menghapus semua data KipLog di perangkat itu**; data masih dapat ditarik ulang dari Drive pada login berikutnya.
- Perangkat yang dipakai bersama berarti data dapat diakses orang lain yang memakai browser tersebut selama cache login masih ada — pakai **Keluar** di Pengaturan bila perangkat berpindah tangan.
- Mode penyamaran (incognito) tidak menyimpan data sama sekali.
- Sinkronisasi memakai model snapshot terakhir menang — mengedit di dua perangkat pada waktu berdekatan akan kehilangan salah satu sisi.
- Berkas di folder Drive sinkron dapat dilihat semua akun Google yang folder itu dibagikan kepadanya.

Lakukan **Backup Data** secara rutin (halaman Backup & Import) dan simpan
berkas backup di lokasi terpisah.

## Panduan Backup/Restore

Backup Ringan mengekspor seluruh data ke satu berkas JSON
(`kiplog-backup-YYYY-MM-DD.json`); Backup Lengkap menyertakan berkas bukti
dukung asli dalam ZIP. Restore dapat mengganti seluruh data atau
menggabungkannya dengan data yang sudah ada.

## Privasi

Lihat [docs/PRIVACY.md](docs/PRIVACY.md) — termasuk peringatan penting
tentang berbagi tautan Google Drive: berkas yang ditautkan ke KipApp menjadi
dapat diakses siapa pun yang memiliki tautannya, jadi periksa pengaturan
berbagi folder sebelum menempelkan tautan.

## Batasan yang jujur

- **Tidak terintegrasi dengan KipApp** — tidak ada API, tidak ada login otomatis, tidak ada pengiriman data. Bookmarklet autofill hanya mengisi field di browser Anda sendiri; Anda tetap yang menekan Save.
- **Butuh akun Google yang diizinkan** — tanpa itu aplikasi tidak dapat dibuka sama sekali, dan perangkat baru butuh internet untuk login pertama.
- **Sinkronisasi bukan penggabungan sungguhan** — snapshot terakhir menang, bukan merge per-record; bukan untuk beberapa orang mengedit bersamaan.
- **KipLog tidak mengunggah berkas Data Dukung ke Drive secara otomatis** — folder sinkron hanya berisi data KipLog dan bukti dukung mentah; berkas PDF Data Dukung yang tautannya dipakai di KipApp tetap diunggah pengguna sendiri.
- Status "Sudah diinput ke KipApp" adalah **penanda manual**, bukan konfirmasi bahwa KipApp benar-benar menerima data.

## Roadmap

7 fase implementasi bertahap — lihat [PRD §20](PRD-KipLog-BPS-v3.1.md) dan
[docs/DELIVERABLE-0.md §12](docs/DELIVERABLE-0.md).

## Lisensi

Belum ditetapkan. Repository ini sudah publik tanpa berkas lisensi, yang
secara default berarti hak cipta tetap dipegang penuh pemilik proyek dan
tidak ada izin pemakaian ulang yang diberikan. Pemilik proyek perlu memilih
lisensi bila pemakaian ulang oleh orang lain diinginkan.
