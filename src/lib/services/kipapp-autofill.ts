import type { Activity, PerformancePlan } from '@/types';

/**
 * Autofill form KipApp dari data KipLog.
 *
 * SUMBER: dua tahap. Awalnya tangkapan layar `Panduan KipApp - Pengguna
 * V.3.1.pdf` halaman 66; lalu **dikoreksi terhadap tangkapan layar form
 * sungguhan KipApp v2.0.4 (2026)** yang dikirim pemilik proyek. Panduan itu
 * bertanggal 2022 dan formnya sudah berubah; lalu **dikoreksi lagi setelah
 * pengguna benar-benar mencobanya**, yang memperlihatkan Rencana Kinerja dan
 * Tanggal sama sekali tidak terisi karena keduanya komponen popup, bukan
 * kontrol HTML biasa.
 *
 * | Label di KipApp             | Kontrol   | Catatan                          |
 * |-----------------------------|-----------|----------------------------------|
 * | Pegawai / Tahun / SKP       | teks baca | terisi sendiri, tidak disentuh   |
 * | * Rencana Kinerja           | combobox  | BUKAN select — klik, ketik untuk mencari, lalu KLIK opsinya (nama RK verbatim, DR-01) |
 * | Gunakan periode tanggal     | checkbox  | BEDA 2026 — dibiarkan tidak tercentang (kegiatan KipLog selalu satu hari) |
 * | Gunakan jam                 | checkbox  | BEDA 2026 — **Jam Mulai/Selesai tidak ada di DOM sampai ini dicentang** |
 * | * Tanggal                   | picker    | klik membuka kalender yang punya kotak isian sendiri; formatnya ISO (terlihat "2026-04-01") |
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

/** Jeda antar langkah, memberi waktu popup KipApp muncul dan menutup. */
export const AUTOFILL_STEP_DELAY_MS = 300;

/**
 * Sumber skrip bookmarklet, sengaja disimpan sebagai teks yang bisa dibaca
 * ulang oleh manusia (dan oleh pengguna sebelum ia memasangnya).
 *
 * Ditulis ES5 tanpa modul karena dijalankan sebagai URL `javascript:` di
 * dalam halaman pihak lain: tidak ada bundler, tidak boleh memuat berkas dari
 * luar (CSP KipApp hampir pasti memblokirnya), dan harus utuh sendiri.
 *
 * BERJALAN BERTAHAP DENGAN JEDA. Rencana Kinerja dan Tanggal bukan kontrol
 * HTML biasa: keduanya baru memunculkan isinya SETELAH diklik. Menulis nilai
 * langsung ke kontrolnya tidak berpengaruh sama sekali — itulah yang membuat
 * percobaan pertama pengguna gagal tepat pada kedua field itu. Karena
 * popup-nya muncul belakangan, pengisian dilakukan sebagai rangkaian langkah
 * berjeda, bukan satu jalan lurus.
 */
export const AUTOFILL_SCRIPT = `(function () {
  var HOSTS = ${JSON.stringify(KIPAPP_HOSTS)};
  if (HOSTS.indexOf(location.hostname) === -1) {
    alert('Bookmarklet KipLog hanya untuk ' + HOSTS.join(' atau ') + '. Halaman ini bukan KipApp.');
    return;
  }

  var PANEL_ID = 'kiplog-autofill-panel';
  var DELAY = ${AUTOFILL_STEP_DELAY_MS};
  var OLD = document.getElementById(PANEL_ID);
  if (OLD) OLD.remove();

  var SIMPLE_LABELS = [
    ['kegiatan', 'Kegiatan'],
    ['progres', 'Progres'],
    ['capaian', 'Capaian'],
    ['dataDukung', 'Data Dukung'],
    ['masukanKeCapaianSkp', 'Masukan ke capaian SKP']
  ];
  var CONTROLS = 'input:not([type=hidden]), textarea, select';

  function norm(s) {
    return (s || '').replace(/\\s+/g, ' ').replace(/[*:]/g, '').trim().toLowerCase();
  }

  function list(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function size(el) {
    return el.getElementsByTagName('*').length;
  }

  function visible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  /**
   * Panel KipLog sendiri selalu dikecualikan: kotak tempel di dalamnya MEMUAT
   * nama RK yang sedang dicari, jadi tanpa ini skrip bisa "menemukan" opsi RK
   * di dalam kotaknya sendiri.
   */
  function inPanel(el) {
    var panel = document.getElementById(PANEL_ID);
    return !!(panel && panel.contains(el));
  }

  function dialogScope() {
    var TITLE = 'add capaian kegiatan perhari';
    var best = null;
    var bestSize = Infinity;
    var nodes = list('div, section, form');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (inPanel(el)) continue;
      if (norm(el.textContent).indexOf(TITLE) === -1) continue;
      if (!el.querySelector(CONTROLS)) continue;
      var s = size(el);
      if (s < bestSize) { best = el; bestSize = s; }
    }
    return best || document.body;
  }

  var SCOPE = dialogScope();

  function flatIndex(el) {
    var all = document.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) if (all[i] === el) return i;
    return -1;
  }

  function controlNear(el, selector) {
    var anchor = flatIndex(el);
    var best = null;
    var bestDistance = Infinity;
    var scope = el;
    for (var up = 0; up < 6 && scope; up++) {
      var found = list(selector || CONTROLS, scope);
      for (var i = 0; i < found.length; i++) {
        var c = found[i];
        if (c.disabled || c.readOnly || inPanel(c)) continue;
        var d = Math.abs(flatIndex(c) - anchor);
        if (d < bestDistance) { best = c; bestDistance = d; }
      }
      if (best) return best;
      scope = scope.parentElement;
    }
    return null;
  }

  function findControl(labelText, selector) {
    var wanted = norm(labelText);
    var nodes = list('label, span, div, td, p, strong, b', SCOPE);
    var best = null;
    var bestSize = Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (inPanel(el)) continue;
      if (norm(el.textContent) !== wanted) continue;
      var s = size(el);
      if (s < bestSize) { best = el; bestSize = s; }
    }
    return best ? controlNear(best, selector) : null;
  }

  function setNative(ctl, value) {
    var proto = ctl.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(ctl, value);
    else ctl.value = value;
    ctl.dispatchEvent(new Event('input', { bubbles: true }));
    ctl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function press(el, key) {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key: key, bubbles: true }));
  }

  /** Klik yang meniru tekan-lepas, karena banyak komponen membuka diri pada mousedown. */
  function tap(el) {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    el.click();
  }

  function snapshotInputs() {
    return list('input:not([type=hidden]), textarea').filter(function (el) {
      return !inPanel(el) && visible(el);
    });
  }

  /** Input yang BARU terlihat sesudah sesuatu diklik — isi popup yang baru terbuka. */
  function newInputs(before) {
    var now = list('input:not([type=hidden]), textarea');
    var fresh = [];
    for (var i = 0; i < now.length; i++) {
      var el = now[i];
      if (inPanel(el) || el.disabled || el.readOnly) continue;
      if (!visible(el)) continue;
      if (before.indexOf(el) !== -1) continue;
      fresh.push(el);
    }
    return fresh;
  }

  /** Calon opsi dropdown: elemen mana pun yang teksnya persis sama. */
  function findOption(text) {
    var wanted = norm(text);
    var nodes = list('li, div, span, p, a, td, option, label');
    var best = null;
    var bestSize = Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (inPanel(el) || !visible(el)) continue;
      if (norm(el.textContent) !== wanted) continue;
      var s = size(el);
      if (s < bestSize) { best = el; bestSize = s; }
    }
    return best;
  }

  function setToggle(labelText, wanted) {
    var cb = findControl(labelText, 'input[type=checkbox]');
    if (!cb) return null;
    if (cb.checked !== wanted) cb.click();
    return cb.checked === wanted;
  }

  function mark(el) {
    if (el) el.style.outline = '2px solid #16a34a';
  }

  function run(steps, done) {
    var i = 0;
    function next() {
      if (i >= steps.length) { done(); return; }
      var step = steps[i++];
      try { step(); } catch (e) { /* satu langkah gagal tidak menghentikan sisanya */ }
      setTimeout(next, DELAY);
    }
    next();
  }

  function apply(data, report) {
    var done = [];
    var failed = [];
    var notes = [];
    var steps = [];
    var pending = {};

    function ok(label, el) { done.push(label); mark(el); }

    var wantJam = !!(data.jamMulai && data.jamSelesai);

    // 1. Pengalih tampilan lebih dulu: field jam belum ada di halaman sebelum ini.
    steps.push(function () {
      setToggle('Gunakan periode tanggal', false);
      var jam = setToggle('Gunakan jam', wantJam);
      if (wantJam && jam === null) notes.push('checkbox "Gunakan jam" tidak ditemukan');
    });

    // 2. Field biasa — cukup ditulis langsung.
    steps.push(function () {
      for (var i = 0; i < SIMPLE_LABELS.length; i++) {
        var key = SIMPLE_LABELS[i][0];
        var label = SIMPLE_LABELS[i][1];
        var value = data[key];
        if (value === null || value === undefined || value === '') continue;
        var ctl = findControl(label);
        if (!ctl) { failed.push(label + ' (field tidak ditemukan)'); continue; }
        if (ctl.type === 'checkbox') {
          if (ctl.checked !== !!value) ctl.click();
        } else {
          setNative(ctl, String(value));
        }
        ok(label, ctl);
      }
    });

    /**
     * Combobox: klik untuk membuka, ketik untuk menyaring, lalu KLIK opsinya.
     * Menulis nilai ke kontrolnya saja tidak memilih apa pun.
     */
    function comboboxSteps(label, value) {
      steps.push(function () {
        var ctl = findControl(label);
        if (!ctl) { failed.push(label + ' (field tidak ditemukan)'); return; }
        pending[label] = ctl;
        pending[label + ':before'] = snapshotInputs();
        tap(ctl);
      });
      steps.push(function () {
        var ctl = pending[label];
        if (!ctl) return;
        var fresh = newInputs(pending[label + ':before']);
        var search = fresh.length ? fresh[0] : ctl;
        pending[label + ':search'] = search;
        setNative(search, value);
      });
      steps.push(function () {
        var ctl = pending[label];
        if (!ctl) return;
        var option = findOption(value);
        if (!option) {
          // Teks pencarian TIDAK boleh ditinggalkan: kotaknya akan tampak
          // terisi padahal tidak ada yang terpilih, dan itu justru menyesatkan
          // lebih parah daripada kotak kosong.
          var search = pending[label + ':search'];
          if (search) { setNative(search, ''); press(search, 'Escape'); }
          failed.push(label + ' (pilihan tidak ditemukan di daftar setelah dicari)');
          return;
        }
        tap(option);
        ok(label, ctl);
      });
    }

    /**
     * Pemilih tanggal/jam: klik untuk membuka, lalu tulis ke input DI DALAM
     * popup-nya — kalender KipApp memperlihatkan kotak isian sendiri di atas
     * grid tanggal (terlihat berisi "2026-04-01", jadi formatnya ISO) — lalu
     * Enter untuk menguncinya.
     */
    function pickerSteps(label, value) {
      steps.push(function () {
        var ctl = findControl(label);
        if (!ctl) { failed.push(label + ' (field tidak ditemukan)'); return; }
        pending[label] = ctl;
        pending[label + ':before'] = snapshotInputs();
        tap(ctl);
      });
      steps.push(function () {
        var ctl = pending[label];
        if (!ctl) return;
        var fresh = newInputs(pending[label + ':before']);
        var target = fresh.length ? fresh[0] : ctl;
        setNative(target, value);
        press(target, 'Enter');
        target.dispatchEvent(new Event('blur', { bubbles: true }));
        ok(label, ctl);
      });
    }

    if (data.rencanaKinerja) comboboxSteps('Rencana Kinerja', data.rencanaKinerja);
    if (data.tanggal) pickerSteps('Tanggal', data.tanggal);
    if (wantJam) {
      pickerSteps('Jam Mulai', data.jamMulai);
      pickerSteps('Jam Selesai', data.jamSelesai);
    }

    run(steps, function () { report(done, failed, notes); });
  }

  var panel = document.createElement('div');
  panel.id = PANEL_ID;
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
    out.textContent = 'Mengisi\\u2026 Rencana Kinerja dan Tanggal perlu beberapa detik.';
    apply(data, function (done, failed, notes) {
      out.innerHTML = '<b>Terisi:</b> ' + (done.length ? done.join(', ') : '\\u2014') +
        (failed.length ? '<br><b style="color:#b45309">Gagal:</b> ' + failed.join('; ') : '') +
        (notes.length ? '<br><b style="color:#b45309">Catatan:</b> ' + notes.join('; ') : '') +
        '<br><span style="color:#475569">Periksa isian lalu tekan Save sendiri.</span>';
    });
  };
  panel.querySelector('#kiplog-in').focus();
})();`;

/** Skrip di atas dikemas menjadi URL `javascript:` untuk disimpan sebagai bookmark. */
export function buildBookmarkletHref(): string {
  return 'javascript:' + encodeURIComponent(AUTOFILL_SCRIPT);
}
