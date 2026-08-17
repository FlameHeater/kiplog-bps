import type { Activity, PerformancePlan } from '@/types';

/**
 * Autofill form KipApp dari data KipLog.
 *
 * SUMBER: dua tahap. Awalnya tangkapan layar `Panduan KipApp - Pengguna
 * V.3.1.pdf` halaman 66; lalu **dikoreksi terhadap tangkapan layar form
 * sungguhan KipApp v2.0.4 (2026)** yang dikirim pemilik proyek. Panduan itu
 * bertanggal 2022 dan formnya sudah berubah — dua perbedaan yang membuat
 * versi pertama gagal sebagian dicatat di baris "BEDA 2026" di bawah.
 *
 * | Label di KipApp             | Kontrol   | Catatan                          |
 * |-----------------------------|-----------|----------------------------------|
 * | Pegawai / Tahun / SKP       | teks baca | terisi sendiri, tidak disentuh   |
 * | * Rencana Kinerja           | select    | nama RK verbatim (DR-01)         |
 * | Gunakan periode tanggal     | checkbox  | BEDA 2026 — dibiarkan tidak tercentang (kegiatan KipLog selalu satu hari) |
 * | Gunakan jam                 | checkbox  | BEDA 2026 — **Jam Mulai/Selesai tidak ada di DOM sampai ini dicentang** |
 * | * Tanggal                   | picker    | placeholder "Pilih tanggal" — pemilih buatan sendiri, bukan input date bawaan |
 * | * Jam Mulai / * Jam Selesai | time      | hanya muncul lewat "Gunakan jam" |
 * | * Kegiatan                  | textarea  | placeholder "Deskripsi Kegiatan" |
 * | * Progres                   | number    | satu huruf s                     |
 * | * Capaian                   | textarea  | placeholder "Deskripsi Capaian"  |
 * | Data Dukung                 | text      | placeholder "Link Data Dukung"   |
 * | Masukan ke capaian SKP      | checkbox  | bawaannya TIDAK tercentang       |
 *
 * Catatan yang belum terjawab: periode SKP di KipApp 2026 bersifat TRIWULANAN
 * ("1 April - 30 Juni (Triwulan II)"), sedangkan panduan 2022 menunjukkan
 * bulanan dan KipLog memodelkan `skpPeriod` sebagai `YYYY-MM`. Tidak
 * berpengaruh pada autofill (field SKP hanya teks baca), tetapi berpengaruh
 * pada arti "kunci periode" di halaman KipApp Ready — belum diubah karena itu
 * menyentuh skema data, bukan fitur ini.
 *
 * PERUBAHAN SIKAP TERHADAP CON-03. PRD melarang scraping, otomasi
 * headless-browser, dan login otomatis ke KipApp. Fitur ini diminta eksplisit
 * oleh pemilik proyek setelah larangan itu dibacakan kembali kepadanya, dan
 * dirancang tetap di dalam batas yang penting:
 *
 * - Tidak ada headless browser. Skrip dijalankan pengguna sendiri, dengan
 *   tangannya, di tab KipApp yang sudah ia login.
 * - Tidak ada login otomatis dan tidak ada kredensial yang disimpan (CON-04
 *   dan SEC-01 utuh).
 * - Tidak ada scraping: skrip hanya MENULIS ke field, tidak membaca data
 *   KipApp dan tidak mengirim apa pun ke mana pun.
 * - **Tidak menekan Save.** Pengguna memeriksa lalu menyimpan sendiri. Ini
 *   bukan sekadar kehati-hatian: pencocokan field bertumpu pada teks label
 *   yang terlihat, dan tata letak KipApp bisa berubah kapan saja tanpa
 *   pemberitahuan.
 */

const PAYLOAD_VERSION = 1;

/**
 * Host KipApp yang diizinkan. Bookmarklet menolak berjalan di host lain.
 *
 * Dua-duanya, bukan salah satu: PRD CON-03 menyebut
 * `webapps.bps.go.id/kipapp/`, sedangkan pemilik proyek memakai
 * `kipapp.bps.go.id`. Diperiksa 2026-08-18 — keduanya menjawab HTTP 200, jadi
 * keduanya masih hidup dan tidak ada yang boleh dihapus dari daftar ini
 * berdasarkan dugaan mana yang "lebih baru".
 */
export const KIPAPP_HOSTS = ['kipapp.bps.go.id', 'webapps.bps.go.id'] as const;

export interface KipAppAutofillPayload {
  kiplogAutofill: number;
  rencanaKinerja: string | null;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  kegiatan: string;
  progres: number;
  capaian: string;
  dataDukung: string;
  masukanKeCapaianSkp: boolean;
}

/**
 * Menyusun payload satu kegiatan.
 *
 * `activity.date` sudah ISO `YYYY-MM-DD` (DateStringSchema) sehingga dipakai
 * apa adanya — persis yang diharapkan field Tanggal KipApp. Jam boleh kosong
 * (pengguna memilih tidak mencatat jam); field itu dilewati, bukan diisi
 * string kosong yang akan memicu validasi wajib KipApp.
 */
export function buildAutofillPayload(
  activity: Activity,
  plan?: PerformancePlan | null
): KipAppAutofillPayload {
  return {
    kiplogAutofill: PAYLOAD_VERSION,
    rencanaKinerja: plan?.name ?? null,
    tanggal: activity.date,
    jamMulai: activity.startTime,
    jamSelesai: activity.endTime,
    kegiatan: activity.description,
    progres: activity.progress,
    capaian: activity.achievement,
    dataDukung: activity.evidenceLink ?? '',
    masukanKeCapaianSkp: activity.countsTowardSkp,
  };
}

export function serializeAutofillPayload(payload: KipAppAutofillPayload): string {
  return JSON.stringify(payload, null, 2);
}

/**
 * Kenapa kegiatan ini tidak boleh dikirim ke KipApp.
 *
 * Panduan halaman 68: capaian yang sudah dikirim untuk dinilai **tidak bisa
 * dibatalkan atau diedit**. Menyediakan payload untuk kegiatan seperti itu
 * hanya akan menuntun pengguna ke pekerjaan yang pasti gagal.
 */
export function autofillBlockedReason(activity: Activity): string | null {
  if (activity.sentForReview) {
    return 'Kegiatan ini sudah dikirim untuk dinilai. KipApp tidak mengizinkan perubahan setelah itu.';
  }
  if (!activity.description.trim()) return 'Deskripsi kegiatan masih kosong.';
  if (!activity.achievement.trim()) return 'Capaian masih kosong — KipApp mewajibkan field ini.';
  return null;
}

/**
 * Sumber skrip bookmarklet, sengaja disimpan sebagai teks yang bisa dibaca
 * ulang oleh manusia (dan oleh pengguna sebelum ia memasangnya).
 *
 * Ditulis ES5 tanpa modul karena dijalankan sebagai URL `javascript:` di
 * dalam halaman pihak lain: tidak ada bundler, tidak boleh memuat berkas dari
 * luar (CSP KipApp hampir pasti memblokirnya), dan harus utuh sendiri.
 */
export const AUTOFILL_SCRIPT = `(function () {
  var HOSTS = ${JSON.stringify(KIPAPP_HOSTS)};
  if (HOSTS.indexOf(location.hostname) === -1) {
    alert('Bookmarklet KipLog hanya untuk ' + HOSTS.join(' atau ') + '. Halaman ini bukan KipApp.');
    return;
  }
  var OLD = document.getElementById('kiplog-autofill-panel');
  if (OLD) OLD.remove();

  var LABELS = [
    ['rencanaKinerja', 'Rencana Kinerja'],
    ['tanggal', 'Tanggal'],
    ['jamMulai', 'Jam Mulai'],
    ['jamSelesai', 'Jam Selesai'],
    ['kegiatan', 'Kegiatan'],
    ['progres', 'Progres'],
    ['capaian', 'Capaian'],
    ['dataDukung', 'Data Dukung'],
    ['masukanKeCapaianSkp', 'Masukan ke capaian SKP']
  ];

  function norm(s) {
    return (s || '').replace(/\\s+/g, ' ').replace(/[*:]/g, '').trim().toLowerCase();
  }

  var CONTROLS = 'input:not([type=hidden]), textarea, select';

  function flatIndex(el) {
    var all = document.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) if (all[i] === el) return i;
    return -1;
  }

  /**
   * Kontrol yang PALING DEKAT dengan teks label, bukan yang pertama ditemukan
   * di leluhurnya. Dua checkbox "Gunakan periode tanggal" dan "Gunakan jam"
   * duduk di satu baris yang sama; memilih yang pertama ketemu akan mencentang
   * checkbox yang salah.
   */
  function controlNear(el, selector) {
    var anchor = flatIndex(el);
    var best = null;
    var bestDistance = Infinity;
    var scope = el;
    for (var up = 0; up < 6 && scope; up++) {
      var found = scope.querySelectorAll(selector || CONTROLS);
      for (var i = 0; i < found.length; i++) {
        var c = found[i];
        if (c.disabled || c.readOnly) continue;
        var d = Math.abs(flatIndex(c) - anchor);
        if (d < bestDistance) { best = c; bestDistance = d; }
      }
      if (best) return best;
      scope = scope.parentElement;
    }
    return null;
  }

  function size(el) {
    return el.getElementsByTagName('*').length;
  }

  /**
   * Batasi pencarian ke dalam dialognya saja.
   *
   * Sidebar KipApp memuat menu "Rencana Kinerja" dan "Pelaksanaan", jadi
   * mencari label di seluruh halaman bisa menemukan menu itu, bukan field di
   * dialog. Diambil elemen TERKECIL yang memuat judul dialog sekaligus
   * setidaknya satu kontrol form.
   */
  function dialogScope() {
    var TITLE = 'add capaian kegiatan perhari';
    var nodes = document.querySelectorAll('div, section, form');
    var best = null;
    var bestSize = Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (norm(el.textContent).indexOf(TITLE) === -1) continue;
      if (!el.querySelector(CONTROLS)) continue;
      var s = size(el);
      if (s < bestSize) { best = el; bestSize = s; }
    }
    return best || document.body;
  }

  var SCOPE = dialogScope();

  /**
   * Label dicari sebagai elemen TERKECIL yang teksnya pas.
   *
   * Tidak bisa mensyaratkan elemen tanpa anak: tanda bintang wajib di KipApp
   * adalah elemen sendiri di dalam label (bintang dibungkus tag tersendiri di
   * dalam elemen label), sehingga labelnya punya anak. Sebaliknya juga tidak boleh menerima
   * sembarang leluhur yang teksnya kebetulan sama — karena itu yang subtree-nya
   * paling kecil yang dipakai.
   */
  function findControl(labelText, selector) {
    var wanted = norm(labelText);
    var nodes = SCOPE.querySelectorAll('label, span, div, td, p, strong, b');
    var best = null;
    var bestSize = Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (norm(el.textContent) !== wanted) continue;
      var s = size(el);
      if (s < bestSize) { best = el; bestSize = s; }
    }
    return best ? controlNear(best, selector) : null;
  }

  /**
   * Menyetel checkbox pengalih tampilan ke keadaan yang diinginkan.
   *
   * KipApp 2.0.4 menyembunyikan Jam Mulai/Jam Selesai di balik checkbox
   * "Gunakan jam" — field itu TIDAK ADA di DOM sampai checkbox-nya dicentang.
   * Panduan 2022 tidak punya checkbox ini sama sekali.
   */
  function setToggle(labelText, wanted) {
    var cb = findControl(labelText, 'input[type=checkbox]');
    if (!cb) return null;
    if (cb.checked !== wanted) cb.click();
    return cb.checked === wanted;
  }

  function setNative(ctl, value) {
    var proto = ctl.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(ctl, value);
    else ctl.value = value;
    ctl.dispatchEvent(new Event('input', { bubbles: true }));
    ctl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fill(ctl, value) {
    if (ctl.tagName === 'SELECT') {
      var target = norm(value);
      for (var i = 0; i < ctl.options.length; i++) {
        if (norm(ctl.options[i].textContent) === target) {
          ctl.selectedIndex = i;
          ctl.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }
    if (ctl.type === 'checkbox') {
      if (ctl.checked !== !!value) ctl.click();
      return true;
    }
    setNative(ctl, String(value));
    // Tanggal di KipApp 2.0.4 bukan input date bawaan browser melainkan
    // pemilih tanggal buatan sendiri (placeholder "Pilih tanggal"), yang
    // umumnya baru mengambil nilai saat field kehilangan fokus atau Enter
    // ditekan. Kedua isyarat itu dikirim; input/change saja belum tentu cukup.
    if (ctl.type !== 'checkbox') {
      ctl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      ctl.dispatchEvent(new Event('blur', { bubbles: true }));
    }
    return true;
  }

  function apply(data, report) {
    var done = [];
    var failed = [];
    var notes = [];

    // Satu tanggal, bukan rentang: kegiatan KipLog selalu satu hari.
    setToggle('Gunakan periode tanggal', false);

    // Jam hanya ada di DOM setelah "Gunakan jam" dicentang.
    var wantJam = !!(data.jamMulai && data.jamSelesai);
    var jamToggle = setToggle('Gunakan jam', wantJam);
    if (wantJam && jamToggle === null) {
      notes.push('checkbox "Gunakan jam" tidak ditemukan, jam mungkin tidak terisi');
    }

    for (var i = 0; i < LABELS.length; i++) {
      var key = LABELS[i][0];
      var label = LABELS[i][1];
      var value = data[key];
      if (value === null || value === undefined || value === '') continue;
      if ((key === 'jamMulai' || key === 'jamSelesai') && !wantJam) continue;
      var ctl = findControl(label);
      if (!ctl) { failed.push(label + ' (field tidak ditemukan)'); continue; }
      if (!fill(ctl, value)) { failed.push(label + ' (nilai tidak cocok dengan pilihan)'); continue; }
      ctl.style.outline = '2px solid #16a34a';
      done.push(label);
    }
    report(done, failed, notes);
  }

  var panel = document.createElement('div');
  panel.id = 'kiplog-autofill-panel';
  panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:340px;' +
    'background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:10px;padding:12px;' +
    'box-shadow:0 8px 24px rgba(2,6,23,.18);font:13px/1.45 system-ui,sans-serif';
  panel.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
    '<b>KipLog autofill</b><button id="kiplog-x" style="border:0;background:none;font-size:16px;cursor:pointer">&times;</button></div>' +
    '<p style="margin:0 0 6px;color:#475569">Tempel data dari KipLog, lalu Isi Form. ' +
    'Skrip ini <b>tidak menekan Save</b> \\u2014 periksa dulu, simpan sendiri.</p>' +
    '<textarea id="kiplog-in" rows="5" style="width:100%;box-sizing:border-box;font:12px monospace;' +
    'border:1px solid #cbd5e1;border-radius:6px;padding:6px"></textarea>' +
    '<button id="kiplog-go" style="margin-top:8px;width:100%;padding:8px;border:0;border-radius:6px;' +
    'background:#0f172a;color:#fff;font-weight:600;cursor:pointer">Isi Form</button>' +
    '<div id="kiplog-out" style="margin-top:8px;white-space:pre-wrap"></div>';
  document.body.appendChild(panel);

  var out = panel.querySelector('#kiplog-out');
  panel.querySelector('#kiplog-x').onclick = function () { panel.remove(); };
  panel.querySelector('#kiplog-go').onclick = function () {
    var raw = panel.querySelector('#kiplog-in').value;
    var data;
    try { data = JSON.parse(raw); } catch (e) { out.textContent = 'Data tidak bisa dibaca (JSON tidak valid).'; return; }
    if (!data || !data.kiplogAutofill) { out.textContent = 'Ini bukan data autofill dari KipLog.'; return; }
    apply(data, function (done, failed, notes) {
      out.innerHTML = '<b>Terisi:</b> ' + (done.length ? done.join(', ') : '\\u2014') +
        (failed.length ? '<br><b style="color:#b45309">Gagal:</b> ' + failed.join('; ') : '') +
        (notes.length ? '<br><b style="color:#b45309">Catatan:</b> ' + notes.join('; ') : '') +
        '<br><span style="color:#475569">Periksa isian \\u2014 terutama Tanggal \\u2014 lalu tekan Save sendiri.</span>';
    });
  };
  panel.querySelector('#kiplog-in').focus();
})();`;

/** Skrip di atas dikemas menjadi URL `javascript:` untuk disimpan sebagai bookmark. */
export function buildBookmarkletHref(): string {
  return 'javascript:' + encodeURIComponent(AUTOFILL_SCRIPT);
}
