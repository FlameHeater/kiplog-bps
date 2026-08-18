/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://kipapp.bps.go.id/" }
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTOFILL_SCRIPT,
  autofillBlockedReason,
  buildAutofillPayload,
  buildAutofillBatch,
  buildBookmarkletHref,
  serializeAutofillBatch,
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

describe('buildAutofillBatch', () => {
  const other = {
    ...activity,
    id: '33333333-3333-4333-8333-333333333333',
    date: '2026-08-15',
    description: 'Kegiatan lebih awal',
  };
  const planById = new Map([[plan.id, plan]]);

  it('mengurutkan antrean menurut tanggal, bukan urutan masukan', () => {
    // Antreannya dikerjakan berurutan waktu di KipApp, bukan per RK.
    const { batch } = buildAutofillBatch([activity, other], planById);
    expect(batch.items.map((i) => i.tanggal)).toEqual(['2026-08-15', '2026-08-17']);
  });

  it('mengeluarkan kegiatan yang belum siap kirim beserta alasannya', () => {
    const sent = { ...other, sentForReview: true };
    const { batch, skipped } = buildAutofillBatch([activity, sent], planById);
    expect(batch.items).toHaveLength(1);
    expect(skipped[0]?.reason).toMatch(/dikirim untuk dinilai/i);
  });

  it('menyertakan nama RK tiap kegiatan, karena RK dipilih di dalam dialog', () => {
    const { batch } = buildAutofillBatch([activity], planById);
    expect(batch.items[0]?.rencanaKinerja).toBe(plan.name);
  });

  it('menandai dirinya sebagai antrean supaya bookmarklet bisa membedakannya', () => {
    const { batch } = buildAutofillBatch([activity], planById);
    expect(batch.kiplogAutofill).toBe(2);
    expect(Array.isArray(batch.items)).toBe(true);
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
  // Dirender ke wadahnya sendiri, TIDAK menimpa seluruh body. KipApp adalah
  // SPA yang hanya merender ulang bagiannya sendiri; tiruan yang menyapu body
  // akan ikut menghapus panel bookmarklet dan membuat mode otomatis tampak
  // gagal padahal kodenya benar.
  for (const id of ['rk-portal', 'date-portal', 'time-portal']) {
    document.getElementById(id)?.remove();
  }
  let root = document.getElementById('kipapp-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'kipapp-root';
    document.body.appendChild(root);
  }
  root.innerHTML = `
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
  datePopup.id = 'date-portal';
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
  timePopup.id = 'time-portal';
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
    localStorage.clear();
    document.body.innerHTML = '';
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

  it('membuka antrean saat yang ditempel adalah data sebulan', () => {
    const second = { ...activity, date: '2026-08-18', description: 'Kegiatan hari berikutnya' };
    const { batch } = buildAutofillBatch([activity, second], new Map([[plan.id, plan]]));
    runBookmarklet(serializeAutofillBatch(batch));

    expect(document.querySelector<HTMLElement>('#kiplog-queue')!.style.display).toBe('block');
    expect(document.querySelector('#kiplog-progress')!.textContent).toContain('Kegiatan 1 dari 2');
    expect(document.querySelector('#kiplog-current')!.textContent).toContain('17 Agustus 2026');
  });

  it('mengisi kegiatan yang sedang aktif, lalu kegiatan berikutnya setelah ditekan Berikutnya', () => {
    const second = {
      ...activity,
      date: '2026-08-18',
      description: 'Kegiatan hari berikutnya',
    };
    const { batch } = buildAutofillBatch([activity, second], new Map([[plan.id, plan]]));
    runBookmarklet(serializeAutofillBatch(batch));

    document.querySelector<HTMLButtonElement>('#kiplog-fill')!.click();
    vi.runAllTimers();
    expect(dateValue()).toBe('2026-08-17');

    document.querySelector<HTMLButtonElement>('#kiplog-next')!.click();
    expect(document.querySelector('#kiplog-progress')!.textContent).toContain('Kegiatan 2 dari 2');

    document.querySelector<HTMLButtonElement>('#kiplog-fill')!.click();
    vi.runAllTimers();
    expect(dateValue()).toBe('2026-08-18');
    expect(document.querySelector<HTMLTextAreaElement>('#f-keg')!.value).toBe(second.description);
  });

  it('melompat ke tanggal berikutnya, melewati sisa kegiatan di hari yang sama', () => {
    const sameDay = {
      ...activity,
      description: 'Kegiatan kedua hari yang sama',
      startTime: '13:00',
    };
    const nextDay = { ...activity, date: '2026-08-18', description: 'Kegiatan besok' };
    const { batch } = buildAutofillBatch([activity, sameDay, nextDay], new Map([[plan.id, plan]]));
    runBookmarklet(serializeAutofillBatch(batch));

    document.querySelector<HTMLButtonElement>('#kiplog-nextday')!.click();

    expect(document.querySelector('#kiplog-progress')!.textContent).toContain('Kegiatan 3 dari 3');
    expect(document.querySelector('#kiplog-current')!.textContent).toContain('18 Agustus 2026');
  });

  it('melanjutkan dari posisi terakhir setelah halaman dimuat ulang', () => {
    const second = { ...activity, date: '2026-08-18', description: 'Kegiatan hari berikutnya' };
    const { batch } = buildAutofillBatch([activity, second], new Map([[plan.id, plan]]));

    runBookmarklet(serializeAutofillBatch(batch));
    document.querySelector<HTMLButtonElement>('#kiplog-next')!.click();

    // Tiru muat ulang: panel hilang, antrean dijalankan lagi dari awal.
    document.getElementById('kiplog-autofill-panel')!.remove();
    runBookmarklet(serializeAutofillBatch(batch));

    expect(document.querySelector('#kiplog-progress')!.textContent).toContain('Kegiatan 2 dari 2');
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('Dilanjutkan');
  });

  it('menolak antrean kosong alih-alih membuka panel yang tidak bisa dipakai', () => {
    runBookmarklet(JSON.stringify({ kiplogAutofill: 2, items: [] }));
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('Antrean kosong');
    expect(document.querySelector<HTMLElement>('#kiplog-queue')!.style.display).toBe('none');
  });

  it('memindahkan panel saat header digeser', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    const panel = document.getElementById('kiplog-autofill-panel')!;
    const head = document.getElementById('kiplog-head')!;

    head.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true }));
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 260, clientY: 180, bubbles: true })
    );
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    // Titik pegangan dipertahankan: panel bergeser sejauh kursor bergerak
    // (+160, +80), bukan melompat supaya sudutnya menempel ke kursor.
    expect(panel.style.left).toBe('160px');
    expect(panel.style.top).toBe('80px');
    // Sudut penambat lama harus dilepas, kalau tidak panel tertarik dua arah.
    expect(panel.style.right).toBe('auto');
    expect(panel.style.bottom).toBe('auto');
  });

  it('tidak membiarkan panel digeser keluar layar', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    const panel = document.getElementById('kiplog-autofill-panel')!;
    const head = document.getElementById('kiplog-head')!;

    head.dispatchEvent(new MouseEvent('mousedown', { clientX: 0, clientY: 0, bubbles: true }));
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: -500, clientY: -500, bubbles: true })
    );
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(panel.style.left).toBe('0px');
    expect(panel.style.top).toBe('0px');
  });

  it('tidak ikut menggeser saat tombol tutup yang ditekan', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    const panel = document.getElementById('kiplog-autofill-panel')!;
    const close = document.getElementById('kiplog-x')!;

    close.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50, bubbles: true }));
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 400, clientY: 400, bubbles: true })
    );

    expect(panel.style.left).toBe('');
  });

  it('mengingat posisi panel untuk pemakaian berikutnya', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    const head = document.getElementById('kiplog-head')!;
    head.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, bubbles: true }));
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 300, clientY: 220, bubbles: true })
    );
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    document.getElementById('kiplog-autofill-panel')!.remove();
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));

    const panel = document.getElementById('kiplog-autofill-panel')!;
    expect(panel.style.left).toBe('290px');
    expect(panel.style.top).toBe('210px');
  });

  it('mengembalikan panel ke sudut saat header diklik ganda', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    const panel = document.getElementById('kiplog-autofill-panel')!;
    const head = document.getElementById('kiplog-head')!;

    head.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, bubbles: true }));
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 300, clientY: 220, bubbles: true })
    );
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    head.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(panel.style.right).toBe('16px');
    expect(panel.style.bottom).toBe('16px');
    expect(panel.style.left).toBe('auto');
  });

  it('menjepit posisi tersimpan ke dalam layar yang lebih kecil', () => {
    // Posisi dari layar besar tidak boleh membuat panel hilang di layar kecil.
    localStorage.setItem(
      'kiplog-autofill-geometry',
      JSON.stringify({ left: 5000, top: 4000, width: 340, height: 300 })
    );
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));

    const panel = document.getElementById('kiplog-autofill-panel')!;
    expect(Number.parseInt(panel.style.left, 10)).toBeLessThanOrEqual(window.innerWidth);
    expect(Number.parseInt(panel.style.top, 10)).toBeLessThanOrEqual(window.innerHeight);
  });

  it('bisa diubah ukurannya lewat pegangan bawaan browser', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    const panel = document.getElementById('kiplog-autofill-panel')!;
    // overflow wajib menyertai resize; tanpa itu resize:both tidak berlaku.
    expect(panel.style.resize).toBe('both');
    expect(panel.style.overflow).toBe('auto');
  });

  /**
   * Meniru siklus KipApp yang sesungguhnya untuk mode otomatis: menekan Save
   * MENUTUP dialog (itulah tanda tersimpan), dan menekan Add membangunnya
   * kembali dalam keadaan kosong.
   */
  function wireSaveAndAdd(options?: { rejectSave?: boolean }) {
    const saved: string[] = [];
    const add = document.createElement('button');
    add.textContent = 'Add';
    document.body.appendChild(add);

    function attachSave() {
      const save = document.querySelector<HTMLButtonElement>('#f-save');
      if (!save) return;
      save.addEventListener('click', () => {
        if (options?.rejectSave) {
          // Validasi gagal: dialog TETAP terbuka, ditambah pesan error.
          const err = document.createElement('div');
          err.className = 'ant-form-explain';
          err.textContent = 'Wajib diisi';
          document.querySelector('.ant-modal-body')!.appendChild(err);
          return;
        }
        saved.push(document.querySelector<HTMLTextAreaElement>('#f-keg')!.value);
        document.querySelector('.ant-modal-wrap')!.remove();
      });
    }
    attachSave();

    add.addEventListener('click', () => {
      if (document.querySelector('.ant-modal-wrap')) return;
      renderFakeKipAppDialog();
      attachSave();
    });

    return { saved };
  }

  function startAuto(batchJson: string) {
    runBookmarklet(batchJson);
    document.querySelector<HTMLButtonElement>('#kiplog-auto')!.click();
    vi.runAllTimers();
  }

  it('menyimpan seluruh antrean sendiri: isi, Save, Add, lanjut', () => {
    const second = { ...activity, date: '2026-08-18', description: 'Kegiatan hari berikutnya' };
    const { batch } = buildAutofillBatch([activity, second], new Map([[plan.id, plan]]));
    const kipapp = wireSaveAndAdd();

    startAuto(serializeAutofillBatch(batch));

    expect(kipapp.saved).toEqual([activity.description, second.description]);
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('Antrean selesai');
  });

  it('BERHENTI pada kegagalan pertama, tidak melanjutkan ke kegiatan berikutnya', () => {
    // Field Data Dukung dihapus supaya pengisian dilaporkan tidak lengkap.
    const second = { ...activity, date: '2026-08-18', description: 'Kegiatan hari berikutnya' };
    const { batch } = buildAutofillBatch([activity, second], new Map([[plan.id, plan]]));
    const kipapp = wireSaveAndAdd();
    document.querySelector('#f-link')!.closest('.ant-row')!.remove();

    startAuto(serializeAutofillBatch(batch));

    expect(kipapp.saved).toEqual([]);
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('Berhenti di kegiatan 1');
  });

  it('BERHENTI saat KipApp menolak simpanan, tanpa menganggapnya tersimpan', () => {
    const second = { ...activity, date: '2026-08-18', description: 'Kegiatan hari berikutnya' };
    const { batch } = buildAutofillBatch([activity, second], new Map([[plan.id, plan]]));
    wireSaveAndAdd({ rejectSave: true });

    startAuto(serializeAutofillBatch(batch));

    const out = document.querySelector('#kiplog-out')!.textContent!;
    expect(out).toContain('Berhenti');
    expect(out).toContain('menolak');
    // Dialog masih terbuka, jadi tidak boleh dianggap sukses lalu lanjut.
    expect(document.querySelector('.ant-modal-wrap')).not.toBeNull();
  });

  it('tidak menyimpan ulang kegiatan yang sudah tersimpan saat dijalankan lagi', () => {
    // Penghapusan entri ganda di KipApp harus satu per satu, jadi ini penting.
    const second = { ...activity, date: '2026-08-18', description: 'Kegiatan hari berikutnya' };
    const { batch } = buildAutofillBatch([activity, second], new Map([[plan.id, plan]]));
    const first = wireSaveAndAdd();
    startAuto(serializeAutofillBatch(batch));
    expect(first.saved).toHaveLength(2);

    document.getElementById('kiplog-autofill-panel')?.remove();
    renderFakeKipAppDialog();
    const again = wireSaveAndAdd();
    startAuto(serializeAutofillBatch(batch));

    expect(again.saved).toEqual([]);
  });

  it('membuka dialog Add sendiri kalau belum terbuka', () => {
    const { batch } = buildAutofillBatch([activity], new Map([[plan.id, plan]]));
    const kipapp = wireSaveAndAdd();
    document.querySelector('.ant-modal-wrap')!.remove();

    startAuto(serializeAutofillBatch(batch));

    expect(kipapp.saved).toEqual([activity.description]);
  });

  it('berhenti kalau tombol Add tidak ada, alih-alih diam-diam tidak melakukan apa pun', () => {
    const { batch } = buildAutofillBatch([activity], new Map([[plan.id, plan]]));
    document.querySelector('.ant-modal-wrap')!.remove();

    startAuto(serializeAutofillBatch(batch));

    expect(document.querySelector('#kiplog-out')!.textContent).toContain(
      'dialog Add tidak terbuka'
    );
  });

  /** Antrean panjang, untuk menguji batas jumlah sekali jalan. */
  function longBatch(count: number) {
    const items = Array.from({ length: count }, (_, i) =>
      // Tanggal berbeda tiap kegiatan supaya urutannya pasti dan mudah dibaca.
      ({
        ...activity,
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        description: `Kegiatan ${i + 1}`,
      })
    );
    return buildAutofillBatch(items, new Map([[plan.id, plan]])).batch;
  }

  it('berhenti setelah jumlah yang dipilih, bukan menghabiskan seluruh antrean', () => {
    // Dua puluhan simpanan sekaligus ke sistem resmi tanpa jeda memeriksa
    // adalah hal yang justru ingin dihindari pemilik proyek.
    const kipapp = wireSaveAndAdd();
    runBookmarklet(serializeAutofillBatch(longBatch(12)));
    (document.querySelector('#kiplog-limit') as HTMLSelectElement).value = '10';
    document.querySelector<HTMLButtonElement>('#kiplog-auto')!.click();
    vi.runAllTimers();

    expect(kipapp.saved).toHaveLength(10);
    const out = document.querySelector('#kiplog-out')!.textContent!;
    expect(out).toContain('Berhenti setelah 10 kegiatan');
    expect(out).toContain('Sisa 2');
  });

  it('melanjutkan sisa antrean saat dijalankan lagi, tanpa mengulang yang sudah tersimpan', () => {
    const kipapp = wireSaveAndAdd();
    runBookmarklet(serializeAutofillBatch(longBatch(12)));
    (document.querySelector('#kiplog-limit') as HTMLSelectElement).value = '10';
    document.querySelector<HTMLButtonElement>('#kiplog-auto')!.click();
    vi.runAllTimers();

    document.querySelector<HTMLButtonElement>('#kiplog-auto')!.click();
    vi.runAllTimers();

    expect(kipapp.saved).toHaveLength(12);
    expect(kipapp.saved[10]).toBe('Kegiatan 11');
    expect(kipapp.saved[11]).toBe('Kegiatan 12');
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('Antrean selesai');
  });

  it('menjalankan seluruh sisa saat dipilih "semua"', () => {
    const kipapp = wireSaveAndAdd();
    runBookmarklet(serializeAutofillBatch(longBatch(12)));
    (document.querySelector('#kiplog-limit') as HTMLSelectElement).value = 'all';
    document.querySelector<HTMLButtonElement>('#kiplog-auto')!.click();
    vi.runAllTimers();

    expect(kipapp.saved).toHaveLength(12);
  });

  it('berhenti sambil menunjuk kegiatan berikutnya yang belum dikerjakan', () => {
    // Kalau panel berhenti sambil menunjuk kegiatan yang barusan selesai,
    // menekan lanjut akan menyimpannya dua kali.
    wireSaveAndAdd();
    runBookmarklet(serializeAutofillBatch(longBatch(12)));
    (document.querySelector('#kiplog-limit') as HTMLSelectElement).value = '10';
    document.querySelector<HTMLButtonElement>('#kiplog-auto')!.click();
    vi.runAllTimers();

    expect(document.querySelector('#kiplog-progress')!.textContent).toContain(
      'Kegiatan 11 dari 12'
    );
  });

  it('mengingat pilihan jumlah untuk pemakaian berikutnya', () => {
    runBookmarklet(serializeAutofillBatch(longBatch(12)));
    const select = document.querySelector('#kiplog-limit') as HTMLSelectElement;
    select.value = '30';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    document.getElementById('kiplog-autofill-panel')!.remove();
    runBookmarklet(serializeAutofillBatch(longBatch(12)));

    expect((document.querySelector('#kiplog-limit') as HTMLSelectElement).value).toBe('30');
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
