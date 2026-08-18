/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://kipapp.bps.go.id/" }
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTOFILL_SCRIPT,
  autofillBlockedReason,
  buildAutofillPayload,
  buildBookmarkletHref,
  serializeAutofillPayload,
} from '@/lib/services/kipapp-autofill';
import type { Activity, PerformancePlan } from '@/types';

const activity: Activity = {
  id: '11111111-1111-4111-8111-111111111111',
  date: '2026-08-17',
  startTime: '08:00',
  endTime: '11:30',
  description: 'Perbaikan Anomali SE2026 di FASIH',
  progress: 100,
  achievement: 'Terselesaikannya perbaikan anomali SE2026',
  evidenceLink: 'https://drive.google.com/file/d/abc/view',
  countsTowardSkp: true,
  year: 2026,
  skpPeriod: '2026-08',
  performancePlanId: '22222222-2222-4222-8222-222222222222',
  durationMinutes: 210,
  status: 'complete',
  evidenceLinkStatus: 'uploaded',
  tags: [],
  rbAreas: [],
  evidenceCount: 1,
  reportedAt: null,
  sentForReview: false,
  templateId: null,
  createdAt: '2026-08-17T00:00:00.000Z',
  updatedAt: '2026-08-17T00:00:00.000Z',
};

const plan = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Telaksananya Kegiatan Sensus Ekonomi 2026 sesuai SOP dan tepat waktu',
} as PerformancePlan;

const OTHER_RK = 'Terlaksananya Kegiatan Statistik Harga sesuai SOP dan tepat waktu.';

describe('buildAutofillPayload', () => {
  it('memakai tanggal ISO, format yang terlihat di kotak isian kalender KipApp', () => {
    expect(buildAutofillPayload(activity, plan).tanggal).toBe('2026-08-17');
  });

  it('menyertakan nama RK verbatim agar cocok dengan teks opsi di combobox', () => {
    expect(buildAutofillPayload(activity, plan).rencanaKinerja).toBe(plan.name);
  });

  it('tidak menebak nama RK kalau kegiatan belum ditautkan ke RK', () => {
    expect(
      buildAutofillPayload({ ...activity, performancePlanId: null }, null).rencanaKinerja
    ).toBeNull();
  });
});

describe('autofillBlockedReason', () => {
  it('menolak kegiatan yang sudah dikirim untuk dinilai', () => {
    expect(autofillBlockedReason({ ...activity, sentForReview: true })).toMatch(
      /dikirim untuk dinilai/i
    );
  });

  it('menolak kegiatan yang capaiannya masih kosong (field wajib di KipApp)', () => {
    expect(autofillBlockedReason({ ...activity, achievement: '  ' })).toMatch(/capaian/i);
  });

  it('meloloskan kegiatan yang lengkap', () => {
    expect(autofillBlockedReason(activity)).toBeNull();
  });
});

describe('buildBookmarkletHref', () => {
  it('menghasilkan URL javascript: yang bisa disimpan sebagai bookmark', () => {
    const href = buildBookmarkletHref();
    expect(href.startsWith('javascript:')).toBe(true);
    expect(decodeURIComponent(href.slice('javascript:'.length))).toBe(AUTOFILL_SCRIPT);
  });
});

/**
 * Tiruan dialog "Add Capaian Kegiatan Perhari" memakai kerangka **Ant Design
 * Vue 1.x yang sebenarnya**, disalin dari `outerHTML` halaman KipApp yang
 * dikirim pemilik proyek. Sebelumnya tiruan ini memakai `<select>` dan
 * `input type=date` biasa — itulah sebabnya test hijau berkali-kali sementara
 * form sungguhan gagal.
 *
 * Perilaku yang ditirukan, semuanya sebab kegagalan nyata:
 *
 * - Label dan kontrol duduk di dua `ant-col` bersaudara di dalam satu `ant-row`.
 * - Combobox `ant-select` menyembunyikan kotak pencarian di dalamnya; daftar
 *   opsinya dipasang di `<body>`, bukan di dalam dialog; memilih hanya terjadi
 *   saat opsi DIKLIK.
 * - Pemicu tanggal dan jam **readonly** — nilai hanya masuk lewat kotak isian
 *   di dalam popup.
 * - Checkbox menyembunyikan input aslinya di balik `ant-checkbox-inner`.
 * - Jam Mulai/Selesai belum ada di DOM sampai "Gunakan jam" dicentang.
 */
function renderFakeKipAppDialog(): void {
  document.body.innerHTML = `
    <div class="ant-modal-wrap">
      <div class="ant-modal">
        <div class="ant-modal-content">
          <div class="ant-modal-header"><div class="ant-modal-title">Add Capaian Kegiatan Perhari</div></div>
          <div class="ant-modal-body">
            <div class="ant-row"><div class="ant-col ant-col-md-6">Pegawai:</div><div class="ant-col ant-col-md-18">[340063146] Nama Pegawai</div></div>
            <div class="ant-row"><div class="ant-col ant-col-md-6">Tahun:</div><div class="ant-col ant-col-md-18">2026</div></div>
            <div class="ant-row"><div class="ant-col ant-col-md-6">SKP:</div><div class="ant-col ant-col-md-18">1 April - 30 Juni (Triwulan II)</div></div>

            <div class="ant-row">
              <div class="ant-col ant-col-md-6"><span style="color:red">*</span> Rencana Kinerja:</div>
              <div class="ant-col ant-col-md-18">
                <div class="ant-select ant-select-enabled" id="rk-select">
                  <div class="ant-select-selection ant-select-selection--single">
                    <div class="ant-select-selection__rendered">
                      <div class="ant-select-selection__placeholder">Pilih rencana kinerja SKP</div>
                      <div class="ant-select-search ant-select-search--inline" style="display:none">
                        <div class="ant-select-search__field__wrap">
                          <input autocomplete="off" value="" class="ant-select-search__field" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="ant-row">
              <div class="ant-col ant-col-md-24">
                <label class="ant-checkbox-wrapper"><span class="ant-checkbox"><input type="checkbox" class="ant-checkbox-input" id="cb-range" /><span class="ant-checkbox-inner"></span></span><span>Gunakan periode tanggal</span></label>
                <label class="ant-checkbox-wrapper"><span class="ant-checkbox"><input type="checkbox" class="ant-checkbox-input" id="cb-jam" /><span class="ant-checkbox-inner"></span></span><span>Gunakan jam</span></label>
              </div>
            </div>

            <div class="ant-row">
              <div class="ant-col ant-col-md-6"><span style="color:red">*</span> Tanggal:</div>
              <div class="ant-col ant-col-md-18">
                <div class="ant-calendar-picker" id="date-picker">
                  <div><input readonly class="ant-calendar-picker-input ant-input" placeholder="Pilih tanggal" /></div>
                </div>
              </div>
            </div>

            <div id="jam-slot"></div>

            <div class="ant-row">
              <div class="ant-col ant-col-md-6"><span style="color:red">*</span> Kegiatan:</div>
              <div class="ant-col ant-col-md-18"><textarea class="ant-input" id="f-keg" placeholder="Deskripsi Kegiatan"></textarea></div>
            </div>
            <div class="ant-row">
              <div class="ant-col ant-col-md-6"><span style="color:red">*</span> Progres:</div>
              <div class="ant-col ant-col-md-18"><input class="ant-input" id="f-prog" value="100" /></div>
            </div>
            <div class="ant-row">
              <div class="ant-col ant-col-md-6"><span style="color:red">*</span> Capaian:</div>
              <div class="ant-col ant-col-md-18"><textarea class="ant-input" id="f-cap" placeholder="Deskripsi Capaian"></textarea></div>
            </div>
            <div class="ant-row">
              <div class="ant-col ant-col-md-6">Data Dukung:</div>
              <div class="ant-col ant-col-md-18"><input class="ant-input" id="f-link" placeholder="Link Data Dukung" /></div>
            </div>
            <div class="ant-row">
              <div class="ant-col ant-col-md-6">Masukan ke capaian SKP:</div>
              <div class="ant-col ant-col-md-18"><label class="ant-checkbox-wrapper"><span class="ant-checkbox"><input type="checkbox" class="ant-checkbox-input" id="f-skp" /><span class="ant-checkbox-inner"></span></span></label></div>
            </div>

            <button id="f-cancel">Cancel</button>
            <button id="f-save">Save</button>
          </div>
        </div>
      </div>
    </div>`;

  const RK_OPTIONS = [
    plan.name,
    OTHER_RK,
    'Terlaksananya Kegiatan Statistik Jasa sesuai SOP dan tepat waktu',
  ];

  // Combobox: daftar opsi dipasang di <body>, seperti Ant Design sungguhan.
  const select = document.querySelector<HTMLDivElement>('#rk-select')!;
  const trigger = select.querySelector<HTMLDivElement>('.ant-select-selection')!;
  const search = select.querySelector<HTMLInputElement>('.ant-select-search__field')!;
  const dropdown = document.createElement('div');
  dropdown.className = 'ant-select-dropdown';
  document.body.appendChild(dropdown);

  function renderOptions() {
    const query = search.value.trim().toLowerCase();
    dropdown.innerHTML =
      '<ul class="ant-select-dropdown-menu">' +
      RK_OPTIONS.filter((o) => o.toLowerCase().includes(query))
        .map((o) => `<li class="ant-select-dropdown-menu-item">${o}</li>`)
        .join('') +
      '</ul>';
    for (const item of Array.from(
      dropdown.querySelectorAll<HTMLLIElement>('.ant-select-dropdown-menu-item')
    )) {
      item.addEventListener('click', () => {
        const rendered = select.querySelector<HTMLDivElement>('.ant-select-selection__rendered')!;
        const chosen = document.createElement('div');
        chosen.className = 'ant-select-selection-selected-value';
        chosen.textContent = item.textContent;
        rendered.appendChild(chosen);
        dropdown.innerHTML = '';
      });
    }
  }
  trigger.addEventListener('mousedown', renderOptions);
  search.addEventListener('input', renderOptions);

  // Pemilih tanggal: pemicunya readonly, nilai hanya masuk lewat popup + Enter.
  const dateTrigger = document.querySelector<HTMLInputElement>('.ant-calendar-picker-input')!;
  const datePopup = document.createElement('div');
  datePopup.className = 'ant-calendar-picker-container';
  document.body.appendChild(datePopup);
  dateTrigger.addEventListener('mousedown', () => {
    datePopup.innerHTML =
      '<div class="ant-calendar"><input class="ant-calendar-input" placeholder="Pilih tanggal" /><div class="ant-calendar-body">1 2 3</div></div>';
    const inner = datePopup.querySelector<HTMLInputElement>('.ant-calendar-input')!;
    inner.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key !== 'Enter') return;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        dateTrigger,
        inner.value
      );
      datePopup.innerHTML = '';
    });
  });

  // Field jam baru dibuat saat "Gunakan jam" dicentang, juga sebagai pemilih.
  const jamCheckbox = document.querySelector<HTMLInputElement>('#cb-jam')!;
  const slot = document.querySelector<HTMLDivElement>('#jam-slot')!;
  const timePopup = document.createElement('div');
  timePopup.className = 'ant-time-picker-panel';
  document.body.appendChild(timePopup);

  jamCheckbox.addEventListener('change', () => {
    if (!jamCheckbox.checked) {
      slot.innerHTML = '';
      return;
    }
    slot.innerHTML = ['Jam Mulai', 'Jam Selesai']
      .map(
        (label, index) =>
          `<div class="ant-row"><div class="ant-col ant-col-md-6"><span style="color:red">*</span> ${label}:</div>` +
          `<div class="ant-col ant-col-md-18"><div class="ant-time-picker">` +
          `<input readonly class="ant-time-picker-input" id="f-time-${index}" placeholder="Pilih jam" /></div></div></div>`
      )
      .join('');

    for (const input of Array.from(
      slot.querySelectorAll<HTMLInputElement>('.ant-time-picker-input')
    )) {
      input.addEventListener('mousedown', () => {
        timePopup.innerHTML = '<input class="ant-time-picker-panel-input" />';
        const inner = timePopup.querySelector<HTMLInputElement>('.ant-time-picker-panel-input')!;
        inner.addEventListener('keydown', (e) => {
          if ((e as KeyboardEvent).key !== 'Enter') return;
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
            input,
            inner.value
          );
          timePopup.innerHTML = '';
        });
      });
    }
  });
}

/**
 * Halaman Pelaksanaan di belakang dialog: filter "Rencana Kinerja" dan kolom
 * tabel "Tanggal" dengan teks yang sama persis, seperti pada outerHTML asli.
 */
function renderDecoyPage(): void {
  const decoy = document.createElement('div');
  decoy.innerHTML = `
    <div class="ant-row"><div class="ant-col ant-col-md-4">Rencana Kinerja</div>
      <div class="ant-col ant-col-md-20"><div class="ant-select" id="page-rk">
        <div class="ant-select-selection"><div class="ant-select-selection__rendered">
          <div class="ant-select-selection__placeholder">Pilih rencana kinerja SKP</div>
        </div></div></div></div></div>
    <table class="ant-table"><thead><tr><th><span class="ant-table-column-title">Tanggal</span></th></tr></thead></table>`;
  document.body.insertBefore(decoy, document.body.firstChild);
}

/**
 * jsdom melaporkan setiap elemen tanpa dimensi, sehingga pemeriksaan
 * "terlihat" di dalam skrip akan menolak semuanya. Diberi dimensi palsu agar
 * yang diuji adalah logika skripnya, bukan keterbatasan jsdom.
 */
function stubVisibility(): void {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 10 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 10 });
}

/** Menjalankan bookmarklet lalu menuntaskan seluruh langkah berjedanya. */
function runBookmarklet(payload: string): void {
  new Function(AUTOFILL_SCRIPT)();
  const input = document.querySelector<HTMLTextAreaElement>('#kiplog-in')!;
  input.value = payload;
  document.querySelector<HTMLButtonElement>('#kiplog-go')!.click();
  vi.runAllTimers();
}

describe('bookmarklet autofill (skrip yang sebenarnya dikirim, dijalankan di tiruan Ant Design KipApp)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubVisibility();
    renderFakeKipAppDialog();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const chosenRk = () =>
    document.querySelector('#rk-select .ant-select-selection-selected-value')?.textContent ?? null;
  const dateValue = () =>
    document.querySelector<HTMLInputElement>('.ant-calendar-picker-input')!.value;
  const jamChecked = () => document.querySelector<HTMLInputElement>('#cb-jam')!.checked;

  it('memilih Rencana Kinerja dengan MENGKLIK opsinya, bukan sekadar menulis nilainya', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    // Nilai ini hanya muncul kalau opsi benar-benar diklik — mengetik di kotak
    // pencarian tidak memilih apa pun.
    expect(chosenRk()).toBe(plan.name);
  });

  it('mengisi Tanggal lewat kotak isian di dalam popup, karena pemicunya readonly', () => {
    expect(document.querySelector<HTMLInputElement>('.ant-calendar-picker-input')!.readOnly).toBe(
      true
    );
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(dateValue()).toBe('2026-08-17');
  });

  it('mengisi field teks biasa', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(document.querySelector<HTMLTextAreaElement>('#f-keg')!.value).toBe(activity.description);
    expect(document.querySelector<HTMLInputElement>('#f-prog')!.value).toBe('100');
    expect(document.querySelector<HTMLTextAreaElement>('#f-cap')!.value).toBe(activity.achievement);
    expect(document.querySelector<HTMLInputElement>('#f-link')!.value).toBe(activity.evidenceLink);
  });

  it('mencentang "Masukan ke capaian SKP" lewat lapisan yang menerima klik', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(document.querySelector<HTMLInputElement>('#f-skp')!.checked).toBe(true);
  });

  it('mencentang "Gunakan jam" lebih dulu, lalu mengisi kedua jamnya lewat popup', () => {
    expect(document.querySelector('#f-time-0')).toBeNull();
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(jamChecked()).toBe(true);
    expect(document.querySelector<HTMLInputElement>('#f-time-0')!.value).toBe('08:00');
    expect(document.querySelector<HTMLInputElement>('#f-time-1')!.value).toBe('11:30');
  });

  it('mencentang checkbox jam yang BENAR, bukan "Gunakan periode tanggal" di baris yang sama', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(document.querySelector<HTMLInputElement>('#cb-range')!.checked).toBe(false);
  });

  it('membiarkan "Gunakan jam" tidak tercentang saat jam tidak dicatat', () => {
    const noTime = { ...activity, startTime: '', endTime: '' };
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(noTime, plan)));
    expect(jamChecked()).toBe(false);
    expect(document.querySelector('#f-time-0')).toBeNull();
    expect(document.querySelector<HTMLTextAreaElement>('#f-keg')!.value).toBe(noTime.description);
  });

  it('mematikan "Gunakan periode tanggal" bila sedang tercentang — kegiatan KipLog satu hari', () => {
    document.querySelector<HTMLInputElement>('#cb-range')!.click();
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(document.querySelector<HTMLInputElement>('#cb-range')!.checked).toBe(false);
  });

  it('mengembalikan centang "Gunakan jam" saat jamnya gagal diisi', () => {
    // Popup jam dilumpuhkan: nilai tidak akan pernah masuk. Membiarkan
    // centangnya menyala akan meninggalkan DUA field wajib kosong.
    const jam = document.querySelector<HTMLInputElement>('#cb-jam')!;
    jam.addEventListener('change', () => {
      document.querySelector('.ant-time-picker-panel')!.innerHTML = '';
      for (const input of Array.from(
        document.querySelectorAll<HTMLInputElement>('.ant-time-picker-input')
      )) {
        const fresh = input.cloneNode(true) as HTMLInputElement;
        input.replaceWith(fresh);
      }
    });

    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));

    expect(jamChecked()).toBe(false);
    expect(document.querySelector('#kiplog-out')!.textContent).toContain(
      'dikembalikan tidak tercentang'
    );
  });

  it('tidak mengaku berhasil untuk field yang nilainya tidak benar-benar masuk', () => {
    // Popup kalender dilumpuhkan: Enter tidak lagi memindahkan nilainya.
    const trigger = document.querySelector<HTMLInputElement>('.ant-calendar-picker-input')!;
    trigger.replaceWith(trigger.cloneNode(true));

    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));

    const out = document.querySelector('#kiplog-out')!.textContent!;
    expect(out).toContain('Tanggal');
    expect(out.split('Gagal:')[0]).not.toContain('Tanggal');
  });

  it('TIDAK menekan Save', () => {
    const onSave = vi.fn();
    document.querySelector('#f-save')!.addEventListener('click', onSave);
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('melaporkan bila nama RK tidak ada di antara opsi combobox', () => {
    const missing = { ...plan, name: 'RK yang tidak ada di KipApp' } as PerformancePlan;
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, missing)));
    const out = document.querySelector('#kiplog-out')!.textContent!;
    expect(out).toContain('Rencana Kinerja');
    expect(out).toContain('tidak muncul di daftar');
    expect(chosenRk()).toBeNull();
  });

  it('membersihkan kotak pencarian saat opsi tidak ketemu, supaya tidak tampak terisi', () => {
    const missing = { ...plan, name: 'RK yang tidak ada di KipApp' } as PerformancePlan;
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, missing)));
    expect(
      document.querySelector<HTMLInputElement>('#rk-select .ant-select-search__field')!.value
    ).toBe('');
  });

  it('tidak tertipu oleh nama RK yang ada di kotak tempelnya sendiri', () => {
    const missing = { ...plan, name: 'RK yang tidak ada di KipApp' } as PerformancePlan;
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, missing)));
    expect(chosenRk()).toBeNull();
  });

  it('melaporkan field yang tidak ditemukan, tidak mendiamkannya', () => {
    document.querySelector('#f-link')!.closest('.ant-row')!.remove();
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('Data Dukung');
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('Gagal');
  });

  it('menolak data yang bukan payload KipLog', () => {
    runBookmarklet('{"foo":1}');
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('bukan data autofill');
    expect(dateValue()).toBe('');
  });

  it('menolak teks yang bukan JSON', () => {
    runBookmarklet('bukan json');
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('tidak bisa dibaca');
  });

  it('mengisi field di dialog, bukan filter halaman dengan label sama', () => {
    renderDecoyPage();
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));

    expect(chosenRk()).toBe(plan.name);
    expect(dateValue()).toBe('2026-08-17');
    // Filter halaman berlabel sama harus tetap kosong.
    expect(document.querySelector('#page-rk .ant-select-selection-selected-value')).toBeNull();
  });

  it('menyediakan diagnosa struktur form tanpa membocorkan isi field', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    document.querySelector<HTMLButtonElement>('#kiplog-diag')!.click();

    const report = document.querySelector<HTMLTextAreaElement>('#kiplog-in')!.value;
    expect(report).toContain('DIAGNOSA KipLog autofill');
    expect(report).toContain('dialog terdeteksi: ya');
    expect(report).toContain('ant-calendar-picker');
    expect(report).toContain('ant-select');
    // Tidak boleh memuat isi kegiatan atau nama pegawai.
    expect(report).not.toContain(activity.description);
    expect(report).not.toContain('Nama Pegawai');
  });
});
