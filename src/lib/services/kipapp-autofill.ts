import type { Activity, PerformancePlan } from '@/types';

/**
 * Autofill form KipApp dari data KipLog.
 *
 * SUMBER: `Panduan KipApp - Pengguna V.3.1.pdf` halaman 65–67 — tangkapan
 * layar dialog **"Add Capaian Kegiatan Perhari"** dibaca langsung, bukan
 * ditebak dari teks panduan. Label, urutan, jenis kontrol, dan format nilai
 * di bawah persis seperti yang terlihat di dialog itu:
 *
 * | Label di KipApp          | Kontrol   | Contoh nilai di panduan            |
 * |--------------------------|-----------|------------------------------------|
 * | Pegawai / Tahun / SKP    | teks baca | terisi otomatis, tidak diisi skrip |
 * | * Rencana Kinerja        | select    | nama RK verbatim                   |
 * | * Tanggal                | date      | `2022-12-05` (ISO, bukan "5 Desember 2022") |
 * | * Jam Mulai              | time      | `08:00`                            |
 * | * Jam Selesai            | time      | `11:30`                            |
 * | * Kegiatan               | textarea  | deskripsi kegiatan                 |
 * | * Progres                | number    | `100` (satu huruf s)               |
 * | * Capaian                | textarea  | capaian hasil kegiatan             |
 * | Data Dukung              | text      | URL bukti dukung                   |
 * | Masukan ke capaian SKP   | checkbox  | tercentang                         |
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

/** Host KipApp (PRD CON-03). Bookmarklet menolak berjalan di host lain. */
export const KIPAPP_HOST = 'webapps.bps.go.id';

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
  var HOST = '${KIPAPP_HOST}';
  if (location.hostname !== HOST) {
    alert('Bookmarklet KipLog hanya untuk ' + HOST + '. Halaman ini bukan KipApp.');
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

  function controlNear(el) {
    var scope = el;
    for (var up = 0; up < 5 && scope; up++) {
      var found = scope.querySelectorAll('input:not([type=hidden]), textarea, select');
      for (var i = 0; i < found.length; i++) {
        var c = found[i];
        if (!c.disabled && !c.readOnly) return c;
      }
      scope = scope.parentElement;
    }
    return null;
  }

  function findControl(labelText) {
    var wanted = norm(labelText);
    var nodes = document.querySelectorAll('label, span, div, td, p, strong');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.children.length !== 0) continue;
      if (norm(el.textContent) !== wanted) continue;
      var ctl = controlNear(el);
      if (ctl) return ctl;
    }
    return null;
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
    return true;
  }

  function apply(data, report) {
    var done = [];
    var failed = [];
    for (var i = 0; i < LABELS.length; i++) {
      var key = LABELS[i][0];
      var label = LABELS[i][1];
      var value = data[key];
      if (value === null || value === undefined || value === '') continue;
      var ctl = findControl(label);
      if (!ctl) { failed.push(label + ' (field tidak ditemukan)'); continue; }
      if (!fill(ctl, value)) { failed.push(label + ' (nilai tidak cocok dengan pilihan)'); continue; }
      ctl.style.outline = '2px solid #16a34a';
      done.push(label);
    }
    report(done, failed);
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
    apply(data, function (done, failed) {
      out.innerHTML = '<b>Terisi:</b> ' + (done.length ? done.join(', ') : '\\u2014') +
        (failed.length ? '<br><b style="color:#b45309">Gagal:</b> ' + failed.join('; ') : '') +
        '<br><span style="color:#475569">Periksa lalu tekan Save sendiri.</span>';
    });
  };
  panel.querySelector('#kiplog-in').focus();
})();`;

/** Skrip di atas dikemas menjadi URL `javascript:` untuk disimpan sebagai bookmark. */
export function buildBookmarkletHref(): string {
  return 'javascript:' + encodeURIComponent(AUTOFILL_SCRIPT);
}
