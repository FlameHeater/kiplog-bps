# Privasi — KipLog BPS

## Di mana data Anda tersimpan

Seluruh data KipLog (profil, Rencana Kinerja, kegiatan, bukti dukung,
pengaturan) tersimpan di **IndexedDB milik browser di perangkat ini saja**.
KipLog tidak memiliki server, tidak ada backend, dan tidak mengirim data
apa pun ke pihak manapun (CON-05, CON-06, SEC-02, SEC-03). Anda dapat
memverifikasi ini sendiri lewat tab Network di DevTools browser — seharusnya
nol permintaan jaringan keluar saat pemakaian normal (NFR-11).

## Risiko nyata yang perlu Anda ketahui

- **Membersihkan data browser** (cache, cookies, site data) akan menghapus seluruh data KipLog secara permanen, kecuali Anda punya backup.
- **Perangkat bersama**: jika perangkat ini dipakai orang lain dan mereka mengakses browser yang sama, mereka berpotensi melihat data KipLog Anda (NIP, dokumen internal, catatan kegiatan).
- **Mode penyamaran/incognito** tidak menyimpan data — data akan hilang begitu jendela ditutup.
- **Tidak ada sinkronisasi otomatis** antar perangkat atau browser berbeda.

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
- Tidak mengunggah apa pun ke Google Drive/OneDrive secara otomatis (CON-09) — pengguna selalu mengunggah sendiri.
- Tidak menjalankan analytics, telemetry, atau error-reporting pihak ketiga (SEC-03).

## Data yang Anda kelola sendiri

Backup rutin adalah tanggung jawab Anda. Gunakan fitur **Export Backup**
(Fase 5) untuk menyimpan salinan data di lokasi lain, dan simpan berkas itu
dengan hati-hati karena juga berisi data pribadi yang sama.
