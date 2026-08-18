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
export const AUTOFILL_STEP_DELAY_MS = 250;

/** Batas menunggu satu keadaan (mis. daftar opsi muncul) sebelum menyerah. */
export const AUTOFILL_WAIT_TRIES = 20;
export const AUTOFILL_WAIT_INTERVAL_MS = 120;

/**
 * Sumber skrip bookmarklet, sengaja disimpan sebagai teks yang bisa dibaca
 * ulang oleh manusia (dan oleh pengguna sebelum ia memasangnya).
 *
 * Ditulis ES5 tanpa modul karena dijalankan sebagai URL `javascript:` di
 * dalam halaman pihak lain: tidak ada bundler, tidak boleh memuat berkas dari
 * luar (CSP KipApp hampir pasti memblokirnya), dan harus utuh sendiri.
 *
 * TIGA PRINSIP yang lahir dari kegagalan percobaan nyata pengguna:
 *
 * 1. **Menunggu, bukan menebak waktu.** Rencana Kinerja dan Tanggal baru
 *    memunculkan isinya setelah diklik, dan kapan tepatnya tidak bisa
 *    dipastikan. Skrip menunggu keadaan yang dituju sampai muncul (dengan
 *    batas), bukan berharap satu jeda tetap sudah cukup.
 * 2. **Memeriksa, bukan mengaku.** Setiap field diperiksa ulang setelah diisi.
 *    Versi sebelumnya melaporkan "Terisi" begitu ia selesai mengklik, sehingga
 *    pengguna diberi tahu berhasil padahal Rencana Kinerja dan Tanggal masih
 *    kosong — kesalahan yang lebih buruk daripada gagalnya sendiri.
 * 3. **Tidak meninggalkan form lebih buruk daripada saat ditemukan.**
 *    Mencentang "Gunakan jam" memunculkan dua field WAJIB baru; kalau jamnya
 *    ternyata gagal diisi, centang itu dikembalikan seperti semula.
 */
export const AUTOFILL_SCRIPT = `(function () {
  var HOSTS = ${JSON.stringify(KIPAPP_HOSTS)};
  if (HOSTS.indexOf(location.hostname) === -1) {
    alert('Bookmarklet KipLog hanya untuk ' + HOSTS.join(' atau ') + '. Halaman ini bukan KipApp.');
    return;
  }

  var PANEL_ID = 'kiplog-autofill-panel';
  var DELAY = ${AUTOFILL_STEP_DELAY_MS};
  var TRIES = ${AUTOFILL_WAIT_TRIES};
  var INTERVAL = ${AUTOFILL_WAIT_INTERVAL_MS};
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

  /**
   * Seluruh label yang dikenal skrip ini. Dipakai untuk mengetahui kapan
   * pencarian sudah keluar dari baris milik satu label.
   */
  var KNOWN_LABELS = [
    'Rencana Kinerja', 'Tanggal', 'Jam Mulai', 'Jam Selesai', 'Kegiatan',
    'Progres', 'Capaian', 'Data Dukung', 'Masukan ke capaian SKP',
    'Gunakan jam', 'Gunakan periode tanggal', 'Pegawai', 'Tahun', 'SKP'
  ];

  function isKnownLabel(text) {
    for (var k = 0; k < KNOWN_LABELS.length; k++) {
      if (norm(KNOWN_LABELS[k]) === text) return true;
    }
    return false;
  }

  /** Peta posisi seluruh elemen, dibangun sekali per pencarian. */
  function positionMap() {
    var all = document.getElementsByTagName('*');
    var map = [];
    for (var i = 0; i < all.length; i++) map.push(all[i]);
    return map;
  }

  /**
   * Apakah ada label lain DI ANTARA label kita dan kontrol yang dipilih.
   *
   * Kalau ada, kontrol itu milik label lain, bukan milik kita. Aturan ini
   * dipilih karena bisa dinalar langsung dari tata letak: sebuah field selalu
   * berdampingan dengan labelnya, dan tidak pernah ada label lain menyelip di
   * antaranya. Pembanding berbasis jarak sempat dicoba dan ternyata rapuh.
   */
  function labelBetween(map, ownLabel, ctl) {
    var a = map.indexOf(ownLabel);
    var b = map.indexOf(ctl);
    var lo = Math.min(a, b);
    var hi = Math.max(a, b);
    for (var i = lo + 1; i < hi; i++) {
      var el = map[i];
      if (el === ownLabel || inPanel(el)) continue;
      if (el.contains(ownLabel) || el.contains(ctl)) continue;
      if (isKnownLabel(norm(el.textContent))) return true;
    }
    return false;
  }

  /**
   * Kontrol harus benar-benar milik labelnya.
   *
   * Tanpa penjagaan ini pencarian merambat naik sampai menemukan kontrol apa
   * pun, dan ketika sebuah field memang tidak ada — misalnya pemilih jam yang
   * tidak dikenali — nilainya tertulis diam-diam ke field lain yang tidak ada
   * hubungannya. Melaporkan "tidak ditemukan" jauh lebih baik daripada mengisi
   * tempat yang salah.
   */
  var MAX_CONTROL_DISTANCE = 40;

  function controlNear(el, selector) {
    var map = positionMap();
    var anchor = map.indexOf(el);
    var scope = el;
    for (var up = 0; up < 5 && scope; up++) {
      var found = list(selector || CONTROLS, scope);
      var best = null;
      var bestDistance = Infinity;
      for (var i = 0; i < found.length; i++) {
        var c = found[i];
        if (c.disabled || c.readOnly || inPanel(c)) continue;
        var d = Math.abs(map.indexOf(c) - anchor);
        if (d < bestDistance) { best = c; bestDistance = d; }
      }
      if (best) {
        if (bestDistance > MAX_CONTROL_DISTANCE) return null;
        if (labelBetween(map, el, best)) return null;
        return best;
      }
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

  /**
   * Menunggu sebuah keadaan tercapai, bukan menebak berapa lama popup butuh
   * waktu. \`test\` mengembalikan nilai apa pun yang tidak kosong bila sudah.
   */
  function waitFor(test, done, tries) {
    if (tries === undefined) tries = TRIES;
    var result = null;
    try { result = test(); } catch (e) { result = null; }
    if (result || tries <= 0) { done(result); return; }
    setTimeout(function () { waitFor(test, done, tries - 1); }, INTERVAL);
  }

  /**
   * Apakah nilai benar-benar TERCATAT di kontrolnya — bukan sekadar terketik.
   * Combobox menaruh pilihannya sebagai teks di sekitar kontrol, bukan selalu
   * di \`value\`, jadi keduanya diperiksa.
   */
  function holdsValue(ctl, value) {
    var wanted = norm(value);
    if (norm(ctl.value) === wanted) return true;
    var scope = ctl;
    for (var up = 0; up < 3 && scope; up++) {
      if (norm(scope.textContent).indexOf(wanted) !== -1) return true;
      scope = scope.parentElement;
    }
    return false;
  }

  function mark(el) {
    if (el) el.style.outline = '2px solid #16a34a';
  }

  /** Tiap langkah memanggil next() sendiri, supaya boleh menunggu selama perlu. */
  function run(steps, done) {
    var i = 0;
    function next() {
      if (i >= steps.length) { done(); return; }
      var step = steps[i++];
      var moved = false;
      function go() {
        if (moved) return;
        moved = true;
        setTimeout(next, DELAY);
      }
      try { step(go); } catch (e) { go(); }
    }
    next();
  }

  function apply(data, report) {
    var done = [];
    var failed = [];
    var notes = [];
    var steps = [];
    var wantJam = !!(data.jamMulai && data.jamSelesai);
    var jamCheckbox = null;

    function ok(label, el) { done.push(label); mark(el); }
    function filled(label) { return done.indexOf(label) !== -1; }

    // 1. Pengalih tampilan: field jam belum ada di halaman sebelum dicentang.
    steps.push(function (next) {
      var range = findControl('Gunakan periode tanggal', 'input[type=checkbox]');
      if (range && range.checked) range.click();

      jamCheckbox = findControl('Gunakan jam', 'input[type=checkbox]');
      if (!jamCheckbox) {
        if (wantJam) notes.push('checkbox "Gunakan jam" tidak ditemukan');
      } else if (jamCheckbox.checked !== wantJam) {
        jamCheckbox.click();
      }
      next();
    });

    // 2. Field biasa — ditulis langsung, lalu dibaca ulang untuk memastikan.
    steps.push(function (next) {
      for (var i = 0; i < SIMPLE_LABELS.length; i++) {
        var key = SIMPLE_LABELS[i][0];
        var label = SIMPLE_LABELS[i][1];
        var value = data[key];
        if (value === null || value === undefined || value === '') continue;
        var ctl = findControl(label);
        if (!ctl) { failed.push(label + ' (field tidak ditemukan)'); continue; }
        if (ctl.type === 'checkbox') {
          if (ctl.checked !== !!value) ctl.click();
          if (ctl.checked === !!value) ok(label, ctl);
          else failed.push(label + ' (centang tidak berubah)');
        } else {
          setNative(ctl, String(value));
          if (norm(ctl.value) === norm(String(value))) ok(label, ctl);
          else failed.push(label + ' (nilai tidak tersimpan di field)');
        }
      }
      next();
    });

    /**
     * Combobox: klik untuk membuka, ketik untuk menyaring, TUNGGU opsinya
     * muncul, klik opsinya, lalu PASTIKAN pilihannya benar-benar tercatat.
     * Mengetik saja tidak memilih apa pun — inilah yang membuat percobaan
     * pengguna berhenti dengan teks tertulis tapi tidak terpilih.
     */
    function comboboxSteps(label, value) {
      var ctl = null;
      var search = null;
      var before = null;

      steps.push(function (next) {
        ctl = findControl(label);
        if (!ctl) { failed.push(label + ' (field tidak ditemukan)'); next(); return; }
        before = snapshotInputs();
        tap(ctl);
        ctl.focus();
        next();
      });

      steps.push(function (next) {
        if (!ctl) { next(); return; }
        var fresh = newInputs(before);
        search = fresh.length ? fresh[0] : ctl;
        setNative(search, value);
        next();
      });

      // Teks pencarian tidak boleh ditinggalkan saat gagal: kotaknya akan
      // tampak terisi padahal tidak ada yang terpilih, dan itu lebih
      // menyesatkan daripada kotak kosong.
      function clearSearch() {
        if (!search) return;
        setNative(search, '');
        press(search, 'Escape');
      }

      steps.push(function (next) {
        if (!ctl) { next(); return; }
        waitFor(function () { return findOption(value); }, function (option) {
          // Tanpa opsi yang benar-benar diklik, pemeriksaan nilai TIDAK boleh
          // dipercaya: teks yang barusan diketik sudah membuat kotaknya
          // "berisi" nilai yang dicari, sehingga apa pun akan tampak berhasil.
          if (!option) {
            clearSearch();
            failed.push(label + ' (pilihan tidak muncul di daftar setelah dicari)');
            next();
            return;
          }
          tap(option);
          waitFor(function () { return holdsValue(ctl, value) ? 'ya' : null; }, function (recorded) {
            if (recorded) {
              ok(label, ctl);
            } else {
              clearSearch();
              failed.push(label + ' (opsi diklik tapi tidak tercatat terpilih)');
            }
            next();
          }, 8);
        });
      });
    }

    /**
     * Pemilih tanggal/jam: klik untuk membuka, lalu coba tulis ke fieldnya
     * sendiri; kalau nilainya tidak tercatat, coba kotak isian yang muncul di
     * dalam popup. Diperiksa setelah tiap percobaan, bukan diasumsikan.
     */
    function pickerSteps(label, value) {
      var ctl = null;
      var before = null;

      steps.push(function (next) {
        ctl = findControl(label);
        if (!ctl) { failed.push(label + ' (field tidak ditemukan)'); next(); return; }
        before = snapshotInputs();
        tap(ctl);
        ctl.focus();
        next();
      });

      steps.push(function (next) {
        if (!ctl) { next(); return; }

        function attempt(target) {
          setNative(target, value);
          press(target, 'Enter');
        }

        attempt(ctl);
        waitFor(function () { return holdsValue(ctl, value) ? 'ya' : null; }, function (first) {
          if (first) { ok(label, ctl); next(); return; }

          var fresh = newInputs(before);
          for (var i = 0; i < fresh.length; i++) attempt(fresh[i]);

          waitFor(function () { return holdsValue(ctl, value) ? 'ya' : null; }, function (second) {
            if (second) ok(label, ctl);
            else failed.push(label + ' (nilai tidak masuk, sudah dicoba di field dan di popup)');
            next();
          }, 8);
        }, 8);
      });
    }

    if (data.rencanaKinerja) comboboxSteps('Rencana Kinerja', data.rencanaKinerja);
    if (data.tanggal) pickerSteps('Tanggal', data.tanggal);
    if (wantJam) {
      pickerSteps('Jam Mulai', data.jamMulai);
      pickerSteps('Jam Selesai', data.jamSelesai);
    }

    /**
     * Jangan tinggalkan form lebih buruk daripada saat ditemukan: centang
     * "Gunakan jam" memunculkan DUA field wajib baru, jadi kalau jamnya gagal
     * diisi, centang itu dikembalikan.
     */
    steps.push(function (next) {
      if (wantJam && jamCheckbox && jamCheckbox.checked && !(filled('Jam Mulai') && filled('Jam Selesai'))) {
        jamCheckbox.click();
        notes.push('"Gunakan jam" dikembalikan tidak tercentang karena jamnya gagal diisi; kalau dibiarkan, KipApp menuntut dua field wajib yang kosong');
      }
      next();
    });

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
        '<br><span style="color:#475569">Yang tertulis di atas sudah diperiksa ulang, bukan sekadar dicoba. Tekan Save sendiri.</span>';
    });
  };
  panel.querySelector('#kiplog-in').focus();
})();`;

/** Skrip di atas dikemas menjadi URL `javascript:` untuk disimpan sebagai bookmark. */
export function buildBookmarkletHref(): string {
  return 'javascript:' + encodeURIComponent(AUTOFILL_SCRIPT);
}
