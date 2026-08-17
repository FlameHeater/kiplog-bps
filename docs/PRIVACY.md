# Privasi — KipLog BPS

## Di mana data Anda tersimpan

Penyimpanan utama seluruh data KipLog (profil, Rencana Kinerja, kegiatan,
bukti dukung, pengaturan) adalah **IndexedDB milik browser di perangkat
ini**. KipLog tidak memiliki server dan tidak ada backend sendiri (CON-05,
SEC-03).

Sejak fitur login dan sinkronisasi ditambahkan atas permintaan pemilik
proyek, ada **satu pengecualian** terhadap prinsip nol layanan pihak ketiga
(CON-06, SEC-02, NFR-11) yang dipegang ketat sebelumnya:

- **Google Identity Services** dihubungi untuk login, dan endpoint `userinfo` Google dipakai untuk memverifikasi email pemilik token.
- **Google Drive** milik Anda sendiri dipakai sebagai penyimpan sinkronisasi. Salinan seluruh data KipLog (`kiplog-data.json`) beserta berkas bukti dukung asli (subfolder `evidence/`) diunggah ke satu folder Drive yang Anda tentukan.

Tidak ada domain lain yang dihubungi: tidak ada analytics, tidak ada CDN
(font pun tetap di-*self-host* justru karena alasan ini), tidak ada
error-reporting. Anda dapat memverifikasinya lewat tab Network di DevTools —
seluruh permintaan keluar hanya ke domain Google di atas.

Selain akun Google Anda sendiri, pihak yang dapat melihat data ini adalah
**akun Google lain yang folder Drive sinkron itu dibagikan kepadanya** —
folder itu memang dibagikan agar beberapa perangkat/akun Anda melihat data
yang sama. Periksa daftar berbagi folder tersebut bila ragu.

## Risiko nyata yang perlu Anda ketahui

- **Membersihkan data browser** (cache, cookies, site data) akan menghapus seluruh data KipLog di perangkat itu; data masih dapat ditarik ulang dari Drive pada login berikutnya, tetapi jangan bergantung pada itu sebagai satu-satunya backup.
- **Perangkat bersama**: hasil verifikasi login di-cache di `localStorage` supaya aplikasi bisa dibuka offline, jadi selama cache itu ada, siapa pun yang memakai browser tersebut dapat membuka data KipLog Anda (NIP, dokumen internal, catatan kegiatan) tanpa perlu login Google lagi. Tekan **Keluar** di Pengaturan > Sinkronisasi bila perangkat berpindah tangan — ini menghapus cache tersebut dan mencabut token Google.
- **Mode penyamaran/incognito** tidak menyimpan data — data akan hilang begitu jendela ditutup.
- **Sinkronisasi memakai model snapshot terakhir menang**, bukan penggabungan per-record: mengedit di dua perangkat pada waktu berdekatan akan membuat perubahan dari perangkat yang mendorong lebih dulu hilang.
- **Tautan Drive yang bocor**: berkas bukti dukung di folder sinkron mewarisi pengaturan berbagi folder itu — jangan bagikan folder sinkron ke pihak yang tidak berhak melihat isi bukti dukung.

## Peringatan khusus: tautan bukti dukung

KipApp meminta bukti dukung berupa **tautan (URL)**, bukan file. Alur yang
disarankan KipLog adalah: buat berkas Data Dukung → unggah ke Google Drive
Anda sendiri → salin tautannya → tempel di KipLog dan KipApp.

**Sebelum menempelkan tautan Drive ke KipApp**, periksa pengaturan berbagi
folder/berkas tersebut. Siapa pun yang memiliki tautan itu berpotensi dapat
mengaksesnya — ini penting terutama jika bukti dukung memuat data pribadi
responden atau informasi internal yang sensitif.

## Apa yang TIDAK dilakukan KipLog

- Tidak meminta atau menyimpan kredensial KipApp/community dalam bentuk apa pun (CON-04, SEC-01).
- Tidak melakukan scraping, otomasi browser, atau login otomatis ke KipApp (CON-03).
- Tidak mengunggah **berkas Data Dukung** ke Google Drive/OneDrive secara otomatis (CON-09) — berkas yang tautannya Anda tempel ke KipApp selalu Anda unggah sendiri ke folder pilihan Anda. Yang diunggah otomatis hanyalah data sinkronisasi ke folder Drive sinkron (lihat bagian pertama), dan itu tidak menghasilkan tautan yang dipakai di KipApp.
- Tidak menjalankan analytics, telemetry, atau error-reporting pihak ketiga (SEC-03).
- Tidak mengakses berkas lain di Google Drive Anda di luar folder sinkron yang Anda tentukan sendiri — meskipun scope OAuth `drive` yang diminta Google secara teknis mengizinkan lebih dari itu (scope yang lebih sempit tidak dapat membaca folder yang dibagikan antar akun, sehingga sinkronisasi multi-akun tidak mungkin dengannya).

## Data yang Anda kelola sendiri

Backup rutin adalah tanggung jawab Anda. Gunakan fitur **Export Backup**
(Fase 5) untuk menyimpan salinan data di lokasi lain, dan simpan berkas itu
dengan hati-hati karena juga berisi data pribadi yang sama.
