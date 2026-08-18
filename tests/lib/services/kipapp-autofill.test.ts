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
 * Tiruan dialog "Add Capaian Kegiatan Perhari" KipApp v2.0.4, dibangun dari
 * tiga tangkapan layar form sungguhan. Yang ditirukan bukan sekadar tampilan
 * melainkan PERILAKUNYA, karena justru perilaku itu yang membuat percobaan
 * pertama pengguna gagal:
 *
 * - **Rencana Kinerja bukan `<select>`** melainkan combobox: kotak teks yang
 *   baru memunculkan daftar opsi setelah diklik, menyaring saat diketik, dan
 *   hanya benar-benar memilih ketika opsinya DIKLIK.
 * - **Tanggal bukan input `date`** melainkan pemicu kalender: klik membuka
 *   popup yang punya kotak isian sendiri; nilai baru masuk ke field aslinya
 *   setelah Enter ditekan di kotak itu.
 * - Jam Mulai/Jam Selesai belum ada di DOM sampai "Gunakan jam" dicentang.
 * - Bintang wajib adalah elemen tersendiri di dalam label.
 * - Dua checkbox pengalih duduk di baris yang sama.
 */
function renderFakeKipAppDialog(): void {
  document.body.innerHTML = `
    <div class="modal">
      <h3>Add Capaian Kegiatan Perhari</h3>
      <div class="row"><label>Pegawai:</label><span>[340063146] Nama Pegawai</span></div>
      <div class="row"><label>Tahun:</label><span>2026</span></div>
      <div class="row"><label>SKP:</label><span>1 April - 30 Juni (Triwulan II)</span></div>
      <div class="row"><label><i>*</i> Rencana Kinerja:</label>
        <input id="f-rk" type="text" placeholder="Pilih rencana kinerja SKP" />
        <div id="rk-pop"></div>
      </div>
      <div class="row toggles">
        <input id="f-range" type="checkbox" /><span>Gunakan periode tanggal</span>
        <input id="f-usejam" type="checkbox" /><span>Gunakan jam</span>
      </div>
      <div class="row"><label><i>*</i> Tanggal:</label>
        <input id="f-date" type="text" placeholder="Pilih tanggal" />
        <div id="date-pop"></div>
      </div>
      <div id="jam-slot"></div>
      <div class="row"><label><i>*</i> Kegiatan:</label><textarea id="f-keg" placeholder="Deskripsi Kegiatan"></textarea></div>
      <div class="row"><label><i>*</i> Progres:</label><input id="f-prog" type="number" value="100" /></div>
      <div class="row"><label><i>*</i> Capaian:</label><textarea id="f-cap" placeholder="Deskripsi Capaian"></textarea></div>
      <div class="row"><label>Data Dukung:</label><input id="f-link" type="text" placeholder="Link Data Dukung" /></div>
      <div class="row"><label>Masukan ke capaian SKP:</label><input id="f-skp" type="checkbox" /></div>
      <button id="f-cancel">Cancel</button>
      <button id="f-save">Save</button>
    </div>`;

  const RK_OPTIONS = [
    plan.name,
    OTHER_RK,
    'Terlaksananya Kegiatan Statistik Jasa sesuai SOP dan tepat waktu',
  ];

  // Combobox RK: buka daftar saat diklik, saring saat diketik, pilih saat opsi diklik.
  const rk = document.querySelector<HTMLInputElement>('#f-rk')!;
  const rkPop = document.querySelector<HTMLDivElement>('#rk-pop')!;
  function renderOptions() {
    const query = rk.value.trim().toLowerCase();
    rkPop.innerHTML = RK_OPTIONS.filter((o) => o.toLowerCase().includes(query))
      .map((o) => `<div class="opt">${o}</div>`)
      .join('');
    for (const option of Array.from(rkPop.querySelectorAll<HTMLDivElement>('.opt'))) {
      option.addEventListener('click', () => {
        rk.setAttribute('data-selected', option.textContent!);
        rk.value = option.textContent!;
        rkPop.innerHTML = '';
      });
    }
  }
  rk.addEventListener('mousedown', renderOptions);
  rk.addEventListener('input', () => {
    // Mengetik hanya menyaring; TIDAK memilih apa pun.
    rk.removeAttribute('data-selected');
    renderOptions();
  });

  // Kalender: klik membuka popup berisi kotak isian sendiri; Enter mengunci nilainya.
  const date = document.querySelector<HTMLInputElement>('#f-date')!;
  const datePop = document.querySelector<HTMLDivElement>('#date-pop')!;
  date.addEventListener('mousedown', () => {
    datePop.innerHTML =
      '<input id="date-inner" type="text" value="" /><div class="grid">1 2 3</div>';
    const inner = document.querySelector<HTMLInputElement>('#date-inner')!;
    inner.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key !== 'Enter') return;
      date.value = inner.value;
      datePop.innerHTML = '';
    });
  });

  // Field jam baru dibuat saat "Gunakan jam" dicentang.
  const useJam = document.querySelector<HTMLInputElement>('#f-usejam')!;
  const slot = document.querySelector<HTMLDivElement>('#jam-slot')!;
  useJam.addEventListener('change', () => {
    slot.innerHTML = useJam.checked
      ? '<div class="row"><label><i>*</i> Jam Mulai:</label><input id="f-start" type="time" /></div>' +
        '<div class="row"><label><i>*</i> Jam Selesai:</label><input id="f-end" type="time" /></div>'
      : '';
  });
}

/**
 * Sidebar + halaman di belakang dialog, seperti pada tangkapan layar: menu
 * "Rencana Kinerja" dan filter halaman berlabel sama persis dengan field di
 * dialog. Tanpa pembatasan lingkup, autofill bisa mengisi filter halaman.
 */
function renderDecoyPage(): void {
  const decoy = document.createElement('div');
  decoy.innerHTML = `
    <nav>
      <a href="#">Rencana Kinerja</a>
      <a href="#">RK Anggota</a>
      <a href="#">Pelaksanaan</a>
    </nav>
    <div class="page">
      <div class="row"><label>Rencana Kinerja</label>
        <input id="page-rk" type="text" placeholder="Pilih rencana kinerja SKP" />
      </div>
      <div class="row"><label>Tanggal</label><input id="page-date" type="text" /></div>
    </div>`;
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

describe('bookmarklet autofill (skrip yang sebenarnya dikirim, dijalankan di tiruan dialog KipApp)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubVisibility();
    renderFakeKipAppDialog();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('memilih Rencana Kinerja dengan MENGKLIK opsinya, bukan sekadar menulis nilainya', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    const rk = document.querySelector<HTMLInputElement>('#f-rk')!;
    // data-selected hanya terisi lewat klik opsi — inilah beda antara
    // "terlihat terisi" dan "benar-benar terpilih".
    expect(rk.getAttribute('data-selected')).toBe(plan.name);
    expect(rk.value).toBe(plan.name);
  });

  it('mengisi Tanggal lewat kotak isian di dalam popup kalender, bukan ke fieldnya langsung', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(document.querySelector<HTMLInputElement>('#f-date')!.value).toBe('2026-08-17');
  });

  it('mengisi field biasa lainnya', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(document.querySelector<HTMLTextAreaElement>('#f-keg')!.value).toBe(activity.description);
    expect(document.querySelector<HTMLInputElement>('#f-prog')!.value).toBe('100');
    expect(document.querySelector<HTMLTextAreaElement>('#f-cap')!.value).toBe(activity.achievement);
    expect(document.querySelector<HTMLInputElement>('#f-link')!.value).toBe(activity.evidenceLink);
    expect(document.querySelector<HTMLInputElement>('#f-skp')!.checked).toBe(true);
  });

  it('mencentang "Gunakan jam" lebih dulu, lalu mengisi kedua jamnya', () => {
    expect(document.querySelector('#f-start')).toBeNull();
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(document.querySelector<HTMLInputElement>('#f-usejam')!.checked).toBe(true);
    expect(document.querySelector<HTMLInputElement>('#f-start')!.value).toBe('08:00');
    expect(document.querySelector<HTMLInputElement>('#f-end')!.value).toBe('11:30');
  });

  it('mencentang checkbox jam yang BENAR, bukan "Gunakan periode tanggal" di baris yang sama', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(document.querySelector<HTMLInputElement>('#f-range')!.checked).toBe(false);
  });

  it('membiarkan "Gunakan jam" tidak tercentang saat jam tidak dicatat', () => {
    const noTime = { ...activity, startTime: '', endTime: '' };
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(noTime, plan)));
    expect(document.querySelector<HTMLInputElement>('#f-usejam')!.checked).toBe(false);
    expect(document.querySelector('#f-start')).toBeNull();
    expect(document.querySelector<HTMLTextAreaElement>('#f-keg')!.value).toBe(noTime.description);
  });

  it('mematikan "Gunakan periode tanggal" bila sedang tercentang — kegiatan KipLog satu hari', () => {
    document.querySelector<HTMLInputElement>('#f-range')!.click();
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(document.querySelector<HTMLInputElement>('#f-range')!.checked).toBe(false);
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
    expect(out).toContain('tidak ditemukan');
    expect(document.querySelector('#f-rk')!.getAttribute('data-selected')).toBeNull();
  });

  it('tidak tertipu oleh nama RK yang ada di kotak tempelnya sendiri', () => {
    // Payload di panel KipLog memuat nama RK; kalau panel ikut dicari, skrip
    // akan "menemukan" opsi di sana dan mengklik teks miliknya sendiri.
    const missing = { ...plan, name: 'RK yang tidak ada di KipApp' } as PerformancePlan;
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, missing)));
    expect(document.querySelector('#f-rk')!.getAttribute('data-selected')).toBeNull();
  });

  it('membersihkan teks pencarian saat opsi tidak ketemu, supaya tidak tampak terisi', () => {
    const missing = { ...plan, name: 'RK yang tidak ada di KipApp' } as PerformancePlan;
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, missing)));
    expect(document.querySelector<HTMLInputElement>('#f-rk')!.value).toBe('');
  });

  it('melaporkan field yang tidak ditemukan, tidak mendiamkannya', () => {
    document.querySelector('#f-link')!.closest('.row')!.remove();
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('Data Dukung');
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('Gagal');
  });

  it('menolak data yang bukan payload KipLog', () => {
    runBookmarklet('{"foo":1}');
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('bukan data autofill');
    expect(document.querySelector<HTMLInputElement>('#f-date')!.value).toBe('');
  });

  it('menolak teks yang bukan JSON', () => {
    runBookmarklet('bukan json');
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('tidak bisa dibaca');
  });

  it('mengisi field di dialog, bukan menu sidebar atau filter halaman dengan label sama', () => {
    renderDecoyPage();
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));

    expect(document.querySelector<HTMLInputElement>('#f-rk')!.value).toBe(plan.name);
    expect(document.querySelector<HTMLInputElement>('#f-date')!.value).toBe('2026-08-17');
    expect(document.querySelector<HTMLInputElement>('#page-rk')!.value).toBe('');
    expect(document.querySelector<HTMLInputElement>('#page-date')!.value).toBe('');
  });
});
