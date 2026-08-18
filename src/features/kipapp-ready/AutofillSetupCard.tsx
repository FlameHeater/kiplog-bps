import { useState } from 'react';
import { Check, Copy, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AUTOFILL_VERSION,
  buildBookmarkletHref,
  KIPAPP_HOSTS,
} from '@/lib/services/kipapp-autofill';
import { copyToClipboard } from '@/lib/utils/clipboard';

/**
 * Pemasangan bookmarklet autofill.
 *
 * Tautannya dirender sebagai `<a href="javascript:...">` supaya bisa
 * di-drag ke bilah bookmark — cara paling ringkas memasang bookmarklet. Klik
 * biasa pada tautan itu sengaja tidak melakukan apa-apa di halaman ini
 * (skripnya menolak berjalan di host selain KipApp), jadi salah klik tidak
 * merusak apa pun.
 */
export function AutofillSetupCard() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const href = buildBookmarkletHref();

  async function copyHref() {
    if (await copyToClipboard(href)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="rounded-card border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            Autofill ke KipApp
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Mengisi form KipApp dari data KipLog tanpa menempel satu per satu. Tetap Anda yang
            menekan Save.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? 'Sembunyikan' : 'Cara pakai'}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4 text-xs">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              Tarik tautan <strong>KipLog Autofill</strong> di bawah ke bilah bookmark browser Anda
              (atau salin dan buat bookmark baru dengan alamat itu). Skripnya tertanam di dalam
              bookmark, jadi <strong>tidak ikut ter-update sendiri</strong> — setiap kali aplikasi
              ini diperbarui, hapus bookmark lama dan tarik ulang. Versi saat ini
              <strong>v{AUTOFILL_VERSION}</strong>, dan nomor itu juga tertera di judul panel supaya
              bisa dicocokkan.
            </li>
            <li>
              Buka KipApp, masuk ke <strong>Pelaksanaan Kinerja › Pelaksanaan</strong>, pilih Tahun,
              Periode SKP, dan Rencana Kinerja, lalu klik <strong>Add</strong>.
            </li>
            <li>
              Tekan <strong>Salin sebulan untuk Autofill</strong> untuk seluruh periode, atau{' '}
              <strong>Salin untuk Autofill</strong> di satu kartu kegiatan saja.
            </li>
            <li>
              Kembali ke KipApp, klik bookmark tadi, tempel data ke kotak yang muncul, tekan{' '}
              <strong>Isi Form</strong>.
            </li>
            <li>
              Periksa isinya, lalu tekan <strong>Save</strong> di KipApp sendiri.
            </li>
            <li>
              Untuk data sebulan: panel menampilkan <em>kegiatan ke berapa dari berapa</em> dan{' '}
              <em>hari ke berapa</em>. Setelah Save, tekan <strong>Berikutnya</strong> (atau{' '}
              <strong>Lompat ke tanggal berikutnya</strong>), tekan <strong>Add</strong> lagi di
              KipApp, lalu <strong>Isi Form</strong> — dan seterusnya. Posisinya diingat, jadi
              antrean tetap lanjut walau halaman dimuat ulang.
            </li>
          </ol>

          <div className="flex flex-wrap items-center gap-2 rounded-control border border-dashed border-border bg-muted/40 p-3">
            <a
              href={href}
              onClick={(e) => e.preventDefault()}
              className="cursor-grab rounded-control bg-primary px-3 py-1.5 font-semibold text-primary-foreground"
              title="Tarik ke bilah bookmark"
            >
              KipLog Autofill
            </a>
            <span className="text-muted-foreground">← tarik ke bilah bookmark</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void copyHref()}>
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> Tersalin
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Salin alamatnya
                </>
              )}
            </Button>
          </div>

          <div className="space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground">Batasnya, supaya jelas:</p>
            <ul className="list-disc space-y-0.5 pl-5">
              <li>
                Skrip hanya berjalan di{' '}
                {KIPAPP_HOSTS.map((host, index) => (
                  <span key={host}>
                    {index > 0 ? ' atau ' : ''}
                    <code>{host}</code>
                  </span>
                ))}{' '}
                dan hanya <em>menulis</em> ke field — tidak membaca data KipApp, tidak mengirim apa
                pun ke mana pun.
              </li>
              <li>
                <strong>Tidak menekan Save.</strong> Pencocokan field bertumpu pada teks label yang
                terlihat, dan tata letak KipApp bisa berubah tanpa pemberitahuan — karena itu
                pemeriksaan akhir tetap milik Anda.
              </li>
              <li>Field yang gagal ditemukan dilaporkan di kotak itu, bukan didiamkan.</li>
              <li>
                Mode otomatis menekan Save sendiri sampai jumlah yang Anda pilih (10/20/30/40 atau
                semua) tercapai, lalu berhenti supaya hasilnya bisa diperiksa dulu. Ia berhenti
                total pada kegagalan pertama, dan tidak pernah menyimpan kegiatan yang sama dua
                kali.
              </li>
              <li>
                Panel bisa digeser lewat judulnya dan diubah ukurannya dari sudut kanan bawah;
                posisinya diingat. Klik ganda judulnya untuk mengembalikannya ke sudut.
              </li>
              <li>Tidak ada kredensial KipApp yang diminta atau disimpan.</li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
