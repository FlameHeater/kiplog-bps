# KipLog BPS

Jurnal kerja digital pribadi untuk pegawai BPS. KipLog membantu mencatat
kegiatan kerja harian, mengelola bukti dukung, menghubungkannya dengan
Rencana Kinerja, dan menghasilkan **berkas Data Dukung siap unggah beserta
tautannya** untuk diinput ke KipApp.

> Catat pekerjaan sekali → kelola bukti dukung → hasilkan berkas Data Dukung
> → simpan tautannya → tempel ke KipApp.

## Kenapa ini penting

KipApp meminta **tautan** (URL) sebagai bukti dukung, bukan unggahan file
langsung — field ke-7 pada form Pelaksanaan Kegiatan adalah "Link bukti
dukung". Artinya bukti harus dirapikan menjadi satu berkas, diunggah ke
Google Drive, lalu tautannya disalin kembali ke KipApp. KipLog menyiapkan
rantai kerja ini: mengumpulkan bukti mentah, menghasilkan PDF "Data Dukung
Laporan Kegiatan" siap unggah, dan menyediakan tempat untuk menyimpan
tautan setelah Anda mengunggahnya sendiri.

KipLog **tidak terintegrasi** dengan KipApp — tidak ada API, tidak ada
login otomatis, tidak ada pengiriman data. Anda tetap menyalin/menempel ke
KipApp secara manual; KipLog hanya membuat langkah itu lebih cepat dan
lebih rapi.

## Status

Seluruh 7 fase implementasi selesai (lihat [PRD §20](PRD-KipLog-BPS-v3.1.md)
untuk rincian per fase). `npm run verify` lulus bersih (typecheck + lint +
test + build). Lighthouse: Accessibility 100, Best Practices 100 di semua
mode; Performance 99 (desktop) / 86–87 (mobile default, throttled) — lihat
[docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) untuk rincian gap performa mobile
yang masih ada dan alasannya. **Belum di-deploy** — `git init`/push ke
GitHub Pages menunggu keputusan eksplisit pemilik proyek (lihat "Deploy" di
bawah).

## Arsitektur (ringkas)

Client-only, tanpa backend. React 18 + TypeScript strict, Vite 5, Tailwind +
shadcn/ui, Dexie (IndexedDB) untuk penyimpanan lokal, PWA (installable +
offline lewat `vite-plugin-pwa`). Detail lengkap di
[docs/DELIVERABLE-0.md](docs/DELIVERABLE-0.md) §1–§4.

## Fitur

- **Kegiatan**: form kegiatan harian dengan field persis urutan KipApp, RK combobox dengan fuzzy search, rekomendasi RK otomatis, generator draf capaian.
- **Bukti Dukung**: unggah/kompresi gambar, tautan eksternal, galeri per kegiatan, Evidence Inbox untuk bukti yang belum ditautkan.
- **Kalender & Dashboard**: tampilan bulan/minggu/hari (agenda list di mobile), ringkasan capaian SKP, alert & nudge.
- **Laporan**: PDF "Data Dukung Laporan Kegiatan", Excel, CSV/JSON, Evidence Pack ZIP.
- **KipApp Ready**: mode salin dua kolom untuk memindahkan data ke KipApp secara manual, dengan penguncian periode.
- **Backup & Import**: backup JSON/ZIP, restore (gabung/ganti), hapus semua data, dan rekonsiliasi Excel Pelaksanaan dari KipApp (lihat kolom mana yang sudah/belum tercatat di KipLog).
- **Rencana Kinerja & Template**: 40 RK 2026 (seed), template kegiatan yang bisa dipakai ulang.

## Instalasi & Pengembangan Lokal

```bash
npm install
npm run dev        # dev server
npm run verify      # typecheck + lint + test + build, harus lulus bersih
```

## Build & Deploy ke GitHub Pages

`vite.config.ts` `base` harus sama persis dengan nama repository GitHub
(saat ini `/kiplog-bps/` — ubah jika nama repo berbeda). Deploy otomatis
lewat `.github/workflows/deploy.yml` saat push ke `main`.

## Penyimpanan Data & Implikasinya

**Seluruh data tersimpan di browser perangkat ini saja — tidak pernah
dikirim ke server mana pun.** Konsekuensinya:

- Membersihkan data browser (cache/storage) akan **menghapus semua data KipLog**.
- Perangkat yang dipakai bersama berarti data dapat diakses orang lain yang memakai perangkat tersebut.
- Mode penyamaran (incognito) tidak menyimpan data sama sekali.
- Tidak ada sinkronisasi otomatis antar perangkat/browser.

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

- **Tidak terintegrasi dengan KipApp** — semua penyalinan field dilakukan manual oleh pengguna.
- **Data hanya ada di satu browser/perangkat** — tidak ada sinkronisasi multi-perangkat.
- **KipLog tidak mengunggah apa pun ke Google Drive/OneDrive secara otomatis** — pengguna mengunggah berkas Data Dukung sendiri.
- Status "Sudah diinput ke KipApp" adalah **penanda manual**, bukan konfirmasi bahwa KipApp benar-benar menerima data.

## Roadmap

7 fase implementasi bertahap — lihat [PRD §20](PRD-KipLog-BPS-v3.1.md) dan
[docs/DELIVERABLE-0.md §12](docs/DELIVERABLE-0.md).

## Lisensi

Belum ditetapkan — akan ditentukan pemilik proyek sebelum publikasi publik.
