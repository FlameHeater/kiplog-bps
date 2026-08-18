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

/** Versi payload jamak — satu salinan untuk sebulan penuh. */
const BATCH_VERSION = 2;

export interface KipAppAutofillBatch {
  kiplogAutofill: number;
  items: KipAppAutofillPayload[];
}

export interface BatchBuildResult {
  batch: KipAppAutofillBatch;
  skipped: { description: string; reason: string }[];
}

/**
 * Menyusun antrean sebulan.
 *
 * Diurutkan menurut tanggal lalu jam, bukan per RK, karena antreannya
 * dikerjakan berurutan waktu di KipApp — pengguna menekan Add, mengisi,
 * menyimpan, lalu lanjut ke kegiatan berikutnya.
 *
 * Kegiatan yang tidak layak kirim DIKELUARKAN beserta alasannya, bukan
 * disertakan diam-diam: memasukkan kegiatan yang sudah dikirim untuk dinilai
 * atau yang capaiannya kosong hanya akan menuntun pengguna ke pekerjaan yang
 * pasti gagal di tengah antrean panjang.
 */
export function buildAutofillBatch(
  activities: Activity[],
  planById: Map<string, PerformancePlan>
): BatchBuildResult {
  const items: KipAppAutofillPayload[] = [];
  const skipped: { description: string; reason: string }[] = [];

  const ordered = [...activities].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
  );

  for (const activity of ordered) {
    const reason = autofillBlockedReason(activity);
    if (reason) {
      skipped.push({ description: activity.description, reason });
      continue;
    }
    const plan = activity.performancePlanId
      ? (planById.get(activity.performancePlanId) ?? null)
      : null;
    items.push(buildAutofillPayload(activity, plan));
  }

  return { batch: { kiplogAutofill: BATCH_VERSION, items }, skipped };
}

export function serializeAutofillBatch(batch: KipAppAutofillBatch): string {
  return JSON.stringify(batch, null, 2);
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
 * DITULIS DI ATAS ANT DESIGN VUE 1.x. `outerHTML` halaman KipApp yang dikirim
 * pemilik proyek memastikan kerangkanya: `ant-select`, `ant-row`/`ant-col`,
 * `ant-checkbox-wrapper`, `ant-table`, dan seterusnya. Sebelum ini pencocokan
 * bersandar pada teks label dan kedekatan DOM — tebakan yang gagal berkali-kali
 * di form sungguhan. Nama class kerangka itu jauh lebih pasti, jadi dipakai
 * sebagai jalan utama; penelusuran lewat teks label tetap disimpan sebagai
 * cadangan kalau suatu saat kerangkanya berganti.
 *
 * SEBAB KEGAGALAN TANGGAL AKHIRNYA JELAS: pemilih tanggal dan jam Ant Design
 * memakai input **readonly** sebagai pemicunya — nilai hanya boleh masuk lewat
 * popup. Kode sebelumnya membuang setiap kontrol readonly, baik saat menelusuri
 * label maupun placeholder, sehingga field itu memang tidak akan pernah
 * ditemukan. Sekarang input readonly diterima sebagai PEMICU, dan nilainya
 * ditulis ke input di dalam popup yang terbuka (`ant-calendar-input` /
 * `ant-time-picker-panel-input`).
 *
 * Tiga prinsip dari percobaan-percobaan sebelumnya tetap berlaku: menunggu
 * keadaan yang dituju alih-alih menebak durasi, memeriksa hasil alih-alih
 * mengaku berhasil, dan tidak meninggalkan form lebih buruk daripada saat
 * ditemukan.
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

  // Kerangka Ant Design Vue 1.x, dipastikan dari outerHTML halaman KipApp.
  var ANT = {
    modal: '.ant-modal-content',
    title: '.ant-modal-title',
    row: '.ant-row',
    select: '.ant-select',
    selectTrigger: '.ant-select-selection',
    selectSearch: 'input.ant-select-search__field',
    selectChosen: '.ant-select-selection-selected-value',
    dropdownItem: '.ant-select-dropdown-menu-item',
    dateTrigger: 'input.ant-calendar-picker-input',
    dateInner: 'input.ant-calendar-input',
    timeTrigger: 'input.ant-time-picker-input',
    timeInner: 'input.ant-time-picker-panel-input',
    checkbox: 'input.ant-checkbox-input',
    checkboxWrapper: '.ant-checkbox-wrapper',
    text: 'textarea, input.ant-input, input.ant-input-number-input'
  };

  var LABELS = {
    rencanaKinerja: 'Rencana Kinerja',
    tanggal: 'Tanggal',
    jamMulai: 'Jam Mulai',
    jamSelesai: 'Jam Selesai',
    kegiatan: 'Kegiatan',
    progres: 'Progres',
    capaian: 'Capaian',
    dataDukung: 'Data Dukung',
    masukanKeCapaianSkp: 'Masukan ke capaian SKP'
  };

  function norm(s) {
    return (s || '').replace(/\\s+/g, ' ').replace(/[*:]/g, '').trim().toLowerCase();
  }

  function list(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function visible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function inPanel(el) {
    var panel = document.getElementById(PANEL_ID);
    return !!(panel && panel.contains(el));
  }

  function size(el) {
    return el.getElementsByTagName('*').length;
  }

  /**
   * Dialognya, bukan halaman di belakangnya.
   *
   * Halaman Pelaksanaan punya filter "Rencana Kinerja" dan kolom tabel
   * "Tanggal" dengan teks yang sama persis, jadi tanpa pembatasan ini autofill
   * bisa mengisi filter halaman alih-alih formnya.
   */
  function findModal() {
    var modals = list(ANT.modal).filter(function (el) {
      return !inPanel(el) && visible(el);
    });
    for (var i = modals.length - 1; i >= 0; i--) {
      if (norm(modals[i].textContent).indexOf('add capaian kegiatan perhari') !== -1) return modals[i];
    }
    return modals.length ? modals[modals.length - 1] : null;
  }

  /**
   * Lingkup dihitung ULANG tiap kali dipakai, bukan sekali di awal: dalam mode
   * otomatis dialog dibuat dan dimusnahkan berkali-kali, dan rujukan ke dialog
   * yang sudah dibuang membuat seluruh pencarian field menunjuk ke ruang kosong.
   */
  var MODAL = null;
  var SCOPE = document.body;

  function refreshScope() {
    MODAL = findModal();
    SCOPE = MODAL || document.body;
    return MODAL;
  }

  refreshScope();

  /**
   * Baris field milik sebuah label.
   *
   * Ant Design menaruh label dan kontrolnya di dua kolom bersaudara di dalam
   * satu \`ant-row\`, jadi barisnya adalah wadah yang tepat — bukan hasil
   * perambatan naik sampai ketemu kontrol apa pun, yang dulu bisa mengambil
   * kontrol milik field lain.
   */
  function rowFor(labelText) {
    var wanted = norm(labelText);
    var best = null;
    var bestSize = Infinity;
    var nodes = list('div, span, label, td, p, strong, b', SCOPE);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (inPanel(el) || norm(el.textContent) !== wanted) continue;
      var s = size(el);
      if (s < bestSize) { best = el; bestSize = s; }
    }
    if (!best) return null;

    var scope = best;
    for (var up = 0; up < 5 && scope; up++) {
      if (scope.classList && scope.classList.contains('ant-row')) return scope;
      scope = scope.parentElement;
    }
    return best.parentElement;
  }

  function pick(row, selector) {
    if (!row) return null;
    var found = list(selector, row).filter(function (el) {
      return !inPanel(el) && !el.disabled;
    });
    return found[0] || null;
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

  function tap(el) {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    el.click();
  }

  function waitFor(test, done, tries) {
    if (tries === undefined) tries = TRIES;
    var result = null;
    try { result = test(); } catch (e) { result = null; }
    if (result || tries <= 0) { done(result); return; }
    setTimeout(function () { waitFor(test, done, tries - 1); }, INTERVAL);
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

  /** Checkbox pengalih ("Gunakan jam") dicari lewat pembungkusnya. */
  function toggleByText(labelText) {
    var wanted = norm(labelText);
    var wrappers = list(ANT.checkboxWrapper, SCOPE);
    for (var i = 0; i < wrappers.length; i++) {
      if (inPanel(wrappers[i])) continue;
      if (norm(wrappers[i].textContent) !== wanted) continue;
      return wrappers[i].querySelector(ANT.checkbox);
    }
    var row = rowFor(labelText);
    return pick(row, ANT.checkbox);
  }

  /**
   * Mengubah centang lalu memastikannya berubah. Input aslinya tersembunyi di
   * balik \`ant-checkbox-inner\`, jadi bila klik pada input tidak berpengaruh,
   * lapisan itu yang diklik.
   */
  function setChecked(cb, wanted) {
    if (!cb) return false;
    if (cb.checked === wanted) return true;
    cb.click();
    if (cb.checked === wanted) return true;

    var box = cb.parentElement;
    if (box) {
      var inner = box.querySelector('.ant-checkbox-inner');
      if (inner) { tap(inner); if (cb.checked === wanted) return true; }
      tap(box);
      if (cb.checked === wanted) return true;
    }

    var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
    if (desc && desc.set) desc.set.call(cb, wanted);
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    return cb.checked === wanted;
  }

  function apply(data, report) {
    refreshScope();
    var done = [];
    var failed = [];
    var notes = [];
    var steps = [];
    var wantJam = !!(data.jamMulai && data.jamSelesai);
    var jamCheckbox = null;

    function ok(label, el) { done.push(label); mark(el); }
    function filled(label) { return done.indexOf(label) !== -1; }

    if (!MODAL) {
      notes.push('dialog "Add Capaian Kegiatan Perhari" tidak terdeteksi; pastikan form Add sudah terbuka');
    }

    // 1. Pengalih tampilan: field jam belum ada di halaman sebelum dicentang.
    steps.push(function (next) {
      setChecked(toggleByText('Gunakan periode tanggal'), false);
      jamCheckbox = toggleByText('Gunakan jam');
      if (!jamCheckbox) {
        if (wantJam) notes.push('checkbox "Gunakan jam" tidak ditemukan');
      } else {
        setChecked(jamCheckbox, wantJam);
      }
      next();
    });

    // 2. Field teks biasa.
    steps.push(function (next) {
      var plain = ['kegiatan', 'progres', 'capaian', 'dataDukung'];
      for (var i = 0; i < plain.length; i++) {
        var key = plain[i];
        var label = LABELS[key];
        var value = data[key];
        if (value === null || value === undefined || value === '') continue;
        var row = rowFor(label);
        var ctl = pick(row, ANT.text);
        if (!ctl) { failed.push(label + ' (field tidak ditemukan)'); continue; }
        setNative(ctl, String(value));
        if (norm(ctl.value) === norm(String(value))) ok(label, ctl);
        else failed.push(label + ' (nilai tidak tersimpan di field)');
      }
      next();
    });

    // 3. Checkbox "Masukan ke capaian SKP".
    steps.push(function (next) {
      var label = LABELS.masukanKeCapaianSkp;
      var cb = toggleByText(label);
      if (!cb) { failed.push(label + ' (checkbox tidak ditemukan)'); next(); return; }
      if (setChecked(cb, !!data.masukanKeCapaianSkp)) ok(label, cb);
      else failed.push(label + ' (centang tidak berubah)');
      next();
    });

    /**
     * Combobox Ant Design: klik pemicunya, ketik di kotak pencarian yang
     * tersembunyi di dalamnya, TUNGGU daftar opsinya (dipasang di \`body\`,
     * bukan di dalam dialog), lalu KLIK opsinya. Mengetik saja tidak memilih.
     */
    function comboboxSteps(label, value) {
      var select = null;

      steps.push(function (next) {
        var row = rowFor(label);
        select = pick(row, ANT.select);
        if (!select) { failed.push(label + ' (combobox tidak ditemukan)'); next(); return; }
        tap(select.querySelector(ANT.selectTrigger) || select);
        next();
      });

      steps.push(function (next) {
        if (!select) { next(); return; }
        var search = select.querySelector(ANT.selectSearch);
        if (!search) { failed.push(label + ' (kotak pencarian combobox tidak ditemukan)'); next(); return; }
        search.focus();
        setNative(search, value);
        next();
      });

      steps.push(function (next) {
        if (!select) { next(); return; }
        var wanted = norm(value);
        waitFor(function () {
          var items = list(ANT.dropdownItem).filter(function (el) {
            return !inPanel(el) && visible(el) && norm(el.textContent) === wanted;
          });
          return items[0] || null;
        }, function (option) {
          if (!option) {
            var search = select.querySelector(ANT.selectSearch);
            if (search) { setNative(search, ''); press(search, 'Escape'); }
            failed.push(label + ' (pilihan tidak muncul di daftar setelah dicari)');
            next();
            return;
          }
          tap(option);
          waitFor(function () {
            var chosen = select.querySelector(ANT.selectChosen);
            return chosen && norm(chosen.textContent) === wanted ? 'ya' : null;
          }, function (recorded) {
            if (recorded) ok(label, select);
            else failed.push(label + ' (opsi diklik tapi tidak tercatat terpilih)');
            next();
          }, 8);
        });
      });
    }

    /**
     * Pemilih tanggal/jam Ant Design. Input pemicunya READONLY — nilai hanya
     * bisa masuk lewat kotak isian di dalam popup yang terbuka setelah diklik.
     * Inilah sebab field Tanggal selalu dilaporkan "tidak ditemukan": kontrol
     * readonly dilewati sebelum sempat dicoba.
     */
    function pickerSteps(label, value, triggerSelector, innerSelector) {
      var trigger = null;

      steps.push(function (next) {
        var row = rowFor(label);
        trigger = pick(row, triggerSelector) || pick(row, 'input');
        if (!trigger) { failed.push(label + ' (pemilih tidak ditemukan)'); next(); return; }
        tap(trigger);
        trigger.focus();
        next();
      });

      steps.push(function (next) {
        if (!trigger) { next(); return; }
        waitFor(function () {
          var inner = list(innerSelector).filter(function (el) {
            return !inPanel(el) && visible(el) && !el.disabled;
          });
          return inner[0] || null;
        }, function (inner) {
          // Menulis ke pemicu yang readonly tidak ada gunanya: nilainya masuk
          // ke DOM tapi tidak ke state komponennya, sehingga Save tetap
          // mengirim kosong — dan pemeriksaan nilai akan tertipu mengira
          // berhasil. Kalau popup tidak terbuka, itu kegagalan, bukan jalan
          // cadangan.
          var target = inner || (trigger.readOnly ? null : trigger);
          if (!target) {
            failed.push(label + ' (popup pemilih tidak terbuka)');
            next();
            return;
          }
          setNative(target, value);
          press(target, 'Enter');
          waitFor(function () {
            return norm(trigger.value) === norm(value) ? 'ya' : null;
          }, function (recorded) {
            if (recorded) ok(label, trigger);
            else failed.push(label + ' (nilai ditolak kotak isian di dalam popup)');
            next();
          }, 8);
        });
      });
    }

    if (data.rencanaKinerja) comboboxSteps(LABELS.rencanaKinerja, data.rencanaKinerja);
    if (data.tanggal) pickerSteps(LABELS.tanggal, data.tanggal, ANT.dateTrigger, ANT.dateInner);
    if (wantJam) {
      pickerSteps(LABELS.jamMulai, data.jamMulai, ANT.timeTrigger, ANT.timeInner);
      pickerSteps(LABELS.jamSelesai, data.jamSelesai, ANT.timeTrigger, ANT.timeInner);
    }

    // Jangan tinggalkan form lebih buruk: centang "Gunakan jam" memunculkan dua
    // field WAJIB baru, jadi kalau jamnya gagal diisi, centangnya dikembalikan.
    steps.push(function (next) {
      if (wantJam && jamCheckbox && jamCheckbox.checked && !(filled(LABELS.jamMulai) && filled(LABELS.jamSelesai))) {
        setChecked(jamCheckbox, false);
        notes.push('"Gunakan jam" dikembalikan tidak tercentang karena jamnya gagal diisi; kalau dibiarkan, KipApp menuntut dua field wajib yang kosong');
      }
      next();
    });

    run(steps, function () { report(done, failed, notes); });
  }

  var panel = document.createElement('div');
  panel.id = PANEL_ID;
  // resize:both memberi pegangan ubah-ukuran bawaan browser, jadi tidak perlu
  // menggambar sudut penarik sendiri. overflow:auto wajib menyertainya —
  // tanpa itu resize:both tidak berlaku sama sekali.
  panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:340px;' +
    'max-height:80vh;min-width:260px;min-height:150px;resize:both;overflow:auto;' +
    'background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:10px;padding:12px;' +
    'box-shadow:0 8px 24px rgba(2,6,23,.18);font:13px/1.45 system-ui,sans-serif';
  panel.innerHTML =
    '<div id="kiplog-head" title="Geser untuk memindahkan \u00b7 klik ganda untuk mengembalikan ke sudut" ' +
    'style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;' +
    'cursor:move;user-select:none">' +
    '<b>KipLog autofill</b><button id="kiplog-x" style="border:0;background:none;font-size:16px;cursor:pointer">&times;</button></div>' +
    '<p style="margin:0 0 6px;color:#475569">Tempel data dari KipLog, lalu Isi Form. ' +
    'Skrip ini <b>tidak menekan Save</b> \\u2014 periksa dulu, simpan sendiri.</p>' +
    '<textarea id="kiplog-in" rows="5" style="width:100%;box-sizing:border-box;font:12px monospace;' +
    'border:1px solid #cbd5e1;border-radius:6px;padding:6px"></textarea>' +
    '<button id="kiplog-go" style="margin-top:8px;width:100%;padding:8px;border:0;border-radius:6px;' +
    'background:#0f172a;color:#fff;font-weight:600;cursor:pointer">Isi Form</button>' +
    '<button id="kiplog-diag" style="margin-top:6px;width:100%;padding:6px;border:1px solid #cbd5e1;' +
    'border-radius:6px;background:#fff;color:#0f172a;cursor:pointer">Salin diagnosa (kalau ada yang gagal)</button>' +
    '<div id="kiplog-queue" style="display:none">' +
      '<div id="kiplog-progress" style="font-weight:600"></div>' +
      '<div id="kiplog-current" style="color:#475569;margin:4px 0 8px"></div>' +
      '<button id="kiplog-fill" style="width:100%;padding:8px;border:0;border-radius:6px;' +
      'background:#0f172a;color:#fff;font-weight:600;cursor:pointer">Isi Form</button>' +
      '<div style="display:flex;gap:6px;margin-top:6px">' +
        '<button id="kiplog-prev" style="flex:1;padding:6px;border:1px solid #cbd5e1;border-radius:6px;' +
        'background:#fff;cursor:pointer">&lsaquo; Sebelumnya</button>' +
        '<button id="kiplog-next" style="flex:2;padding:6px;border:1px solid #0f172a;border-radius:6px;' +
        'background:#fff;font-weight:600;cursor:pointer">Berikutnya &rsaquo;</button>' +
      '</div>' +
      '<button id="kiplog-nextday" style="width:100%;margin-top:6px;padding:6px;border:1px solid #cbd5e1;' +
      'border-radius:6px;background:#fff;cursor:pointer">Lompat ke tanggal berikutnya &raquo;</button>' +
      '<div style="display:flex;gap:6px;align-items:center;margin-top:8px">' +
        '<label for="kiplog-limit" style="color:#475569;white-space:nowrap">Sekali jalan</label>' +
        '<select id="kiplog-limit" style="flex:1;padding:5px;border:1px solid #cbd5e1;border-radius:6px;background:#fff">' +
          '<option value="10">10 kegiatan</option>' +
          '<option value="20">20 kegiatan</option>' +
          '<option value="30">30 kegiatan</option>' +
          '<option value="40">40 kegiatan</option>' +
          '<option value="all">semua</option>' +
        '</select>' +
      '</div>' +
      '<button id="kiplog-auto" style="width:100%;margin-top:6px;padding:8px;border:0;border-radius:6px;' +
      'background:#b45309;color:#fff;font-weight:600;cursor:pointer">Jalankan otomatis (menekan Save sendiri)</button>' +
      '<button id="kiplog-abort" style="display:none;width:100%;margin-top:6px;padding:8px;border:0;' +
      'border-radius:6px;background:#dc2626;color:#fff;font-weight:600;cursor:pointer">BERHENTI</button>' +
      '<button id="kiplog-quit" style="width:100%;margin-top:6px;padding:6px;border:0;' +
      'border-radius:6px;background:none;color:#64748b;cursor:pointer">Tutup antrean</button>' +
    '</div>' +
    '<div id="kiplog-out" style="margin-top:8px;white-space:pre-wrap"></div>';
  document.body.appendChild(panel);

  /**
   * Panel bisa dipindahkan dan diubah ukurannya.
   *
   * Bukan kemewahan: panel ini menempel di sudut kanan bawah, dan di sanalah
   * tombol Save serta isi dialog KipApp berada saat halaman digulir. Selama
   * antrean sebulan dikerjakan, panel yang tidak bisa digeser akan menghalangi
   * bagian form yang justru sedang diperiksa.
   *
   * Posisi dan ukuran diingat karena antrean sebulan dikerjakan berkali-kali:
   * memindahkannya sekali seharusnya cukup untuk seterusnya.
   */
  var GEOM_KEY = 'kiplog-autofill-geometry';

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  /**
   * Angka gaya yang kita setel sendiri lebih dipercaya daripada hasil
   * pengukuran tata letak: itulah nilai yang persis diminta pengguna saat
   * menggeser, tanpa pembulatan atau pengaruh transform induk.
   */
  function styleNumber(value, fallback) {
    var parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }

  function saveGeometry() {
    try {
      localStorage.setItem(GEOM_KEY, JSON.stringify({
        left: styleNumber(panel.style.left, panel.offsetLeft),
        top: styleNumber(panel.style.top, panel.offsetTop),
        width: styleNumber(panel.style.width, panel.offsetWidth),
        height: styleNumber(panel.style.height, panel.offsetHeight)
      }));
    } catch (e) { /* penyimpanan diblokir: panel tetap bisa digeser, hanya tidak diingat */ }
  }

  function applyGeometry() {
    var saved = null;
    try {
      var raw = localStorage.getItem(GEOM_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch (e) { saved = null; }
    if (!saved) return;

    // Dijepit ke dalam layar: jendela bisa saja lebih kecil daripada saat
    // posisi itu disimpan, dan panel yang tersimpan di luar layar sama saja
    // dengan panel yang hilang.
    var width = clamp(saved.width || 340, 260, window.innerWidth - 20);
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.width = width + 'px';
    if (saved.height) panel.style.height = clamp(saved.height, 150, window.innerHeight - 20) + 'px';
    panel.style.left = clamp(saved.left || 0, 0, window.innerWidth - width) + 'px';
    panel.style.top = clamp(saved.top || 0, 0, window.innerHeight - 60) + 'px';
  }

  function resetGeometry() {
    try { localStorage.removeItem(GEOM_KEY); } catch (e) { /* diabaikan */ }
    panel.style.left = 'auto';
    panel.style.top = 'auto';
    panel.style.right = '16px';
    panel.style.bottom = '16px';
    panel.style.width = '340px';
    panel.style.height = '';
  }

  var head = panel.querySelector('#kiplog-head');
  head.addEventListener('mousedown', function (event) {
    if (event.target && event.target.id === 'kiplog-x') return;
    event.preventDefault();
    var rect = panel.getBoundingClientRect();
    var grabX = event.clientX - rect.left;
    var grabY = event.clientY - rect.top;

    function onMove(moveEvent) {
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.left = clamp(moveEvent.clientX - grabX, 0, window.innerWidth - panel.offsetWidth) + 'px';
      panel.style.top = clamp(moveEvent.clientY - grabY, 0, window.innerHeight - 40) + 'px';
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      saveGeometry();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  head.addEventListener('dblclick', resetGeometry);

  // Ukuran diubah lewat pegangan bawaan browser, yang tidak memancarkan event
  // tersendiri; ResizeObserver yang menangkapnya. Bila tidak tersedia, ukuran
  // tetap bisa diubah, hanya tidak diingat.
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(function () { saveGeometry(); }).observe(panel);
  }

  applyGeometry();

  var out = panel.querySelector('#kiplog-out');
  panel.querySelector('#kiplog-x').onclick = function () { panel.remove(); };

  /**
   * Laporan struktur form, untuk dikirim balik saat ada yang masih gagal.
   * Hanya bentuk kontrolnya — tidak ada isi field, nama, atau data kegiatan.
   */
  function diagnose() {
    var lines = ['DIAGNOSA KipLog autofill', 'host: ' + location.hostname];
    lines.push('dialog terdeteksi: ' + (MODAL ? 'ya' : 'TIDAK'));
    for (var key in LABELS) {
      if (!Object.prototype.hasOwnProperty.call(LABELS, key)) continue;
      var label = LABELS[key];
      var row = rowFor(label);
      if (!row) { lines.push('- ' + label + ': baris TIDAK ditemukan'); continue; }
      var kinds = [];
      if (pick(row, ANT.select)) kinds.push('ant-select');
      if (pick(row, ANT.dateTrigger)) kinds.push('ant-calendar-picker');
      if (pick(row, ANT.timeTrigger)) kinds.push('ant-time-picker');
      if (pick(row, ANT.checkbox)) kinds.push('ant-checkbox');
      if (pick(row, ANT.text)) kinds.push('teks');
      var any = list('input, textarea', row).filter(function (el) { return !inPanel(el); });
      var shapes = any.map(function (el) {
        return el.tagName.toLowerCase() + (el.type ? '[' + el.type + ']' : '') +
          (el.readOnly ? ' readonly' : '') + (el.disabled ? ' disabled' : '') +
          ' class="' + String(el.className || '').slice(0, 70) + '"';
      });
      lines.push('- ' + label + ': ' + (kinds.length ? kinds.join('+') : 'jenis tidak dikenali'));
      for (var s = 0; s < shapes.length; s++) lines.push('    ' + shapes[s]);
    }
    return lines.join(String.fromCharCode(10));
  }

  panel.querySelector('#kiplog-diag').onclick = function () {
    var box = panel.querySelector('#kiplog-in');
    box.value = diagnose();
    box.focus();
    box.select();
  };

  /**
   * Antrean sebulan.
   *
   * KipApp hanya menerima satu kegiatan per dialog: tekan Add, isi, Save,
   * ulangi. Jadi yang bisa diringkas bukan pengisiannya melainkan
   * PENYIAPANNYA — sekali salin untuk sebulan, lalu antreannya yang mengingat
   * sudah sampai mana, bukan pengguna.
   *
   * Posisi disimpan di localStorage supaya antrean selamat kalau halaman
   * dimuat ulang di tengah jalan; tanpa itu pengguna harus menghitung sendiri
   * sudah sampai kegiatan ke berapa dari dua puluhan.
   */
  var QUEUE_KEY = 'kiplog-autofill-queue';
  var MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  var queue = null;

  function tanggalIndonesia(iso) {
    var parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    return Number(parts[2]) + ' ' + (MONTHS[Number(parts[1]) - 1] || parts[1]) + ' ' + parts[0];
  }

  function queueSignature(items) {
    return items.length + '|' + (items[0] ? items[0].tanggal : '') + '|' +
      (items[items.length - 1] ? items[items.length - 1].tanggal : '');
  }

  function saveProgress() {
    if (!queue) return;
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify({ key: queue.key, index: queue.index }));
    } catch (e) { /* penyimpanan diblokir: antrean tetap jalan, hanya tidak selamat dari reload */ }
  }

  function restoreIndex(key, max) {
    try {
      var raw = localStorage.getItem(QUEUE_KEY);
      if (!raw) return 0;
      var saved = JSON.parse(raw);
      if (!saved || saved.key !== key) return 0;
      return Math.min(Math.max(saved.index || 0, 0), max);
    } catch (e) { return 0; }
  }

  function dayNumbers(items, index) {
    var dates = [];
    for (var i = 0; i < items.length; i++) {
      if (dates.indexOf(items[i].tanggal) === -1) dates.push(items[i].tanggal);
    }
    return { total: dates.length, current: dates.indexOf(items[index].tanggal) + 1 };
  }

  function hint(text) {
    out.innerHTML = '<span style="color:#475569">' + text + '</span>';
  }

  function renderQueue() {
    if (!queue) return;
    updateAutoLabel();
    var item = queue.items[queue.index];
    var days = dayNumbers(queue.items, queue.index);
    panel.querySelector('#kiplog-progress').textContent =
      'Kegiatan ' + (queue.index + 1) + ' dari ' + queue.items.length +
      ' \\u00b7 hari ' + days.current + ' dari ' + days.total;
    panel.querySelector('#kiplog-current').textContent =
      tanggalIndonesia(item.tanggal) + ' \\u2014 ' + item.kegiatan;
    panel.querySelector('#kiplog-prev').disabled = queue.index === 0;
    panel.querySelector('#kiplog-next').disabled = queue.index >= queue.items.length - 1;
  }

  function startQueue(items) {
    queue = { items: items, index: 0, key: queueSignature(items) };
    queue.index = restoreIndex(queue.key, items.length - 1);
    panel.querySelector('#kiplog-in').style.display = 'none';
    panel.querySelector('#kiplog-go').style.display = 'none';
    panel.querySelector('#kiplog-queue').style.display = 'block';
    loadLimit();
    renderQueue();
    hint(queue.index > 0
      ? 'Dilanjutkan dari posisi terakhir. Tekan Add di KipApp, lalu Isi Form.'
      : 'Tekan Add di KipApp, lalu Isi Form.');
  }

  function stopQueue() {
    queue = null;
    try { localStorage.removeItem(QUEUE_KEY); } catch (e) { /* diabaikan */ }
    panel.querySelector('#kiplog-queue').style.display = 'none';
    panel.querySelector('#kiplog-in').style.display = '';
    panel.querySelector('#kiplog-go').style.display = '';
    panel.querySelector('#kiplog-in').value = '';
    out.textContent = 'Antrean ditutup.';
  }

  function move(delta) {
    if (!queue) return;
    queue.index = Math.min(Math.max(queue.index + delta, 0), queue.items.length - 1);
    saveProgress();
    renderQueue();
    hint('Tekan Add di KipApp, lalu Isi Form.');
  }

  function jumpNextDay() {
    if (!queue) return;
    var today = queue.items[queue.index].tanggal;
    for (var i = queue.index + 1; i < queue.items.length; i++) {
      if (queue.items[i].tanggal !== today) {
        queue.index = i;
        saveProgress();
        renderQueue();
        hint('Tekan Add di KipApp, lalu Isi Form.');
        return;
      }
    }
    hint('Sudah di tanggal terakhir.');
  }

  function report(done, failed, notes) {
    out.innerHTML = '<b>Terisi:</b> ' + (done.length ? done.join(', ') : '\\u2014') +
      (failed.length ? '<br><b style="color:#b45309">Gagal:</b> ' + failed.join('; ') : '') +
      (notes.length ? '<br><b style="color:#b45309">Catatan:</b> ' + notes.join('; ') : '') +
      '<br><span style="color:#475569">Sudah diperiksa ulang, bukan sekadar dicoba. Tekan Save sendiri' +
      (queue ? ', lalu Berikutnya.' : '.') + '</span>';
  }

  /**
   * Mode otomatis: mengisi, menekan Save, membuka Add, lalu lanjut sendiri.
   *
   * Diminta eksplisit pemilik proyek, mengubah CON-03a yang semula melarang
   * skrip menekan Save. Konsekuensinya nyata dan disadari: yang masuk ke sistem
   * kinerja resmi bukan lagi yang dilihat manusia, melainkan yang skrip anggap
   * benar. Karena itu pengamannya dibuat ketat, bukan sekadar ada.
   *
   * BERHASIL DIUKUR DARI MENUTUPNYA DIALOG, bukan dari notifikasi. Setelah Save
   * diterima KipApp, dialognya menutup; kalau validasi menolak, dialognya tetap
   * terbuka. Sinyal itu melekat pada perilaku aplikasinya sendiri, tidak pada
   * teks atau nama class notifikasi yang bisa berganti.
   */
  var AUTO_DELAY = 1500;
  var SAVED_KEY = 'kiplog-autofill-saved';
  var LIMIT_KEY = 'kiplog-autofill-limit';
  var autoRunning = false;
  var autoAbort = false;
  var autoRemaining = 0;
  var autoSavedCount = 0;

  /**
   * Berapa kegiatan yang dijalankan sekali tekan.
   *
   * Antrean sebulan bisa dua puluhan entri; menjalankan semuanya sekaligus
   * berarti dua puluhan simpanan ke sistem resmi sebelum ada kesempatan
   * memeriksa hasilnya. Membatasinya per sepuluh memberi titik henti alami
   * untuk membuka daftar Pelaksanaan dan memastikan yang masuk benar.
   */
  function limitSelect() {
    return panel.querySelector('#kiplog-limit');
  }

  function currentLimit() {
    var value = limitSelect().value;
    return value === 'all' ? Infinity : Number(value);
  }

  function loadLimit() {
    try {
      var saved = localStorage.getItem(LIMIT_KEY);
      if (saved) limitSelect().value = saved;
    } catch (e) { /* diabaikan */ }
    updateAutoLabel();
  }

  function updateAutoLabel() {
    var limit = currentLimit();
    var left = queue ? queue.items.length - queue.index : 0;
    var count = Math.min(limit, left);
    panel.querySelector('#kiplog-auto').textContent =
      'Jalankan otomatis (' + (limit === Infinity ? 'semua sisa' : count) +
      ' kegiatan, menekan Save sendiri)';
  }

  function itemSignature(item) {
    return item.tanggal + '|' + item.kegiatan;
  }

  function savedList() {
    try {
      var raw = localStorage.getItem(SAVED_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || !queue || parsed.key !== queue.key) return [];
      return parsed.sigs || [];
    } catch (e) { return []; }
  }

  /**
   * Penanda anti-ganda. Tanpa ini, menjalankan ulang panel di tengah antrean
   * bisa menyimpan kegiatan yang sama dua kali — dan menghapus entri ganda di
   * KipApp harus satu per satu.
   */
  function markSaved(item) {
    try {
      var sigs = savedList();
      sigs.push(itemSignature(item));
      localStorage.setItem(SAVED_KEY, JSON.stringify({ key: queue.key, sigs: sigs }));
    } catch (e) { /* diabaikan */ }
  }

  function alreadySaved(item) {
    return savedList().indexOf(itemSignature(item)) !== -1;
  }

  function buttonByText(text, root) {
    var wanted = norm(text);
    var buttons = list('button', root || document);
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (inPanel(b) || b.disabled || !visible(b)) continue;
      if (norm(b.textContent) === wanted) return b;
    }
    return null;
  }

  function errorVisible() {
    var markers = list('.ant-form-explain, .ant-notification-notice-error, .ant-message-error');
    for (var i = 0; i < markers.length; i++) {
      if (!inPanel(markers[i]) && visible(markers[i])) return true;
    }
    return false;
  }

  function setAutoUI(running) {
    panel.querySelector('#kiplog-auto').style.display = running ? 'none' : '';
    panel.querySelector('#kiplog-abort').style.display = running ? '' : 'none';
    panel.querySelector('#kiplog-fill').disabled = running;
    panel.querySelector('#kiplog-next').disabled = running || queue.index >= queue.items.length - 1;
    panel.querySelector('#kiplog-prev').disabled = running || queue.index === 0;
    panel.querySelector('#kiplog-nextday').disabled = running;
  }

  function autoStopWith(message) {
    autoRunning = false;
    autoAbort = true;
    setAutoUI(false);
    out.innerHTML = '<b style="color:#b45309">Berhenti di kegiatan ' + (queue.index + 1) + ':</b> ' +
      message + '<br><span style="color:#475569">Tidak ada yang disimpan lagi setelah ini. ' +
      'Periksa KipApp, perbaiki, lalu lanjutkan sendiri atau jalankan otomatis lagi.</span>';
  }

  function autoFinish() {
    autoRunning = false;
    setAutoUI(false);
    out.innerHTML = '<b>Antrean selesai.</b><br><span style="color:#475569">' +
      'Periksa daftar Pelaksanaan di KipApp untuk memastikan semuanya tercatat.</span>';
  }

  function autoStart() {
    if (!queue || autoRunning) return;
    autoRunning = true;
    autoAbort = false;
    autoRemaining = currentLimit();
    autoSavedCount = 0;
    try { localStorage.setItem(LIMIT_KEY, limitSelect().value); } catch (e) { /* diabaikan */ }
    setAutoUI(true);
    autoStep();
  }

  /** Jeda karena batas tercapai — berbeda dari selesai maupun gagal. */
  function autoPause() {
    autoRunning = false;
    setAutoUI(false);
    updateAutoLabel();
    var left = queue.items.length - queue.index;
    out.innerHTML = '<b>Berhenti setelah ' + autoSavedCount + ' kegiatan.</b><br>' +
      '<span style="color:#475569">Sisa ' + left + ' kegiatan. Periksa daftar Pelaksanaan di ' +
      'KipApp dulu, lalu tekan Jalankan otomatis lagi untuk melanjutkan.</span>';
  }

  function autoStep() {
    if (!autoRunning || autoAbort) return;
    renderQueue();
    var item = queue.items[queue.index];

    if (alreadySaved(item)) {
      hint('Kegiatan ini sudah pernah disimpan, dilewati.');
      autoAdvance();
      return;
    }

    out.textContent = 'Otomatis: menyiapkan dialog\u2026';
    ensureDialog(function (opened) {
      if (!opened) { autoStopWith('dialog Add tidak terbuka'); return; }
      out.textContent = 'Otomatis: mengisi kegiatan ' + (queue.index + 1) + '\u2026';
      apply(item, function (done, failed, notes) {
        if (autoAbort) return;
        if (failed.length) {
          autoStopWith('pengisian tidak lengkap \u2014 ' + failed.join('; '));
          return;
        }
        if (notes.length) hint('Catatan: ' + notes.join('; '));
        autoSave(item);
      });
    });
  }

  function ensureDialog(callback) {
    if (refreshScope()) { callback(true); return; }
    var add = buttonByText('Add');
    if (!add) { callback(false); return; }
    tap(add);
    waitFor(function () { return refreshScope(); }, function (modal) { callback(!!modal); });
  }

  function autoSave(item) {
    var save = buttonByText('Save', MODAL || document);
    if (!save) { autoStopWith('tombol Save tidak ditemukan di dialog'); return; }
    var previous = MODAL;
    out.textContent = 'Otomatis: menyimpan\u2026';
    tap(save);

    waitFor(function () {
      if (errorVisible()) return 'ditolak';
      var current = findModal();
      return (!current || current !== previous) ? 'tersimpan' : null;
    }, function (result) {
      if (autoAbort) return;
      if (result !== 'tersimpan') {
        autoStopWith(result === 'ditolak'
          ? 'KipApp menolak simpanan ini (validasi gagal)'
          : 'dialog tidak menutup setelah Save, jadi belum tentu tersimpan');
        return;
      }
      markSaved(item);
      autoSavedCount++;
      autoRemaining--;
      autoAdvance();
    }, 40);
  }

  function autoAdvance() {
    if (autoAbort) return;
    if (queue.index >= queue.items.length - 1) { autoFinish(); return; }
    queue.index++;
    saveProgress();
    renderQueue();
    // Batas diperiksa SESUDAH maju, supaya panel berhenti sambil menunjuk
    // kegiatan berikutnya yang belum dikerjakan — bukan yang barusan selesai.
    if (autoRemaining <= 0) { autoPause(); return; }
    setTimeout(autoStep, AUTO_DELAY);
  }

  panel.querySelector('#kiplog-auto').onclick = autoStart;
  limitSelect().onchange = function () {
    try { localStorage.setItem(LIMIT_KEY, limitSelect().value); } catch (e) { /* diabaikan */ }
    updateAutoLabel();
  };
  panel.querySelector('#kiplog-abort').onclick = function () {
    autoAbort = true;
    autoRunning = false;
    setAutoUI(false);
    out.innerHTML = '<b>Dihentikan.</b><br><span style="color:#475569">' +
      'Kegiatan yang sudah tersimpan tidak akan diulang kalau dijalankan lagi.</span>';
  };

  panel.querySelector('#kiplog-fill').onclick = function () {
    if (!queue) return;
    out.textContent = 'Mengisi\\u2026 Rencana Kinerja dan Tanggal perlu beberapa detik.';
    apply(queue.items[queue.index], report);
  };
  panel.querySelector('#kiplog-prev').onclick = function () { move(-1); };
  panel.querySelector('#kiplog-next').onclick = function () { move(1); };
  panel.querySelector('#kiplog-nextday').onclick = jumpNextDay;
  panel.querySelector('#kiplog-quit').onclick = stopQueue;

  panel.querySelector('#kiplog-go').onclick = function () {
    var raw = panel.querySelector('#kiplog-in').value;
    var data;
    try { data = JSON.parse(raw); } catch (e) { out.textContent = 'Data tidak bisa dibaca (JSON tidak valid).'; return; }
    if (!data || !data.kiplogAutofill) { out.textContent = 'Ini bukan data autofill dari KipLog.'; return; }
    if (data.items) {
      if (!data.items.length) { out.textContent = 'Antrean kosong: tidak ada kegiatan yang siap dikirim.'; return; }
      startQueue(data.items);
      return;
    }
    out.textContent = 'Mengisi\\u2026 Rencana Kinerja dan Tanggal perlu beberapa detik.';
    apply(data, report);
  };
  panel.querySelector('#kiplog-in').focus();
})();`;

/** Skrip di atas dikemas menjadi URL `javascript:` untuk disimpan sebagai bookmark. */
export function buildBookmarkletHref(): string {
  return 'javascript:' + encodeURIComponent(AUTOFILL_SCRIPT);
}
