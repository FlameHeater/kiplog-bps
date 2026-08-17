/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://kipapp.bps.go.id/" }
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('buildAutofillPayload', () => {
  it('memakai tanggal ISO seperti yang diharapkan field Tanggal KipApp', () => {
    // Panduan hal. 66 menunjukkan "2022-12-05", bukan "5 Desember 2022".
    expect(buildAutofillPayload(activity, plan).tanggal).toBe('2026-08-17');
  });

  it('menyertakan nama RK verbatim agar cocok dengan opsi di select KipApp', () => {
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
    // Panduan hal. 68: yang sudah dikirim tidak bisa dibatalkan atau diedit.
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
 * Tiruan dialog "Add Capaian Kegiatan Perhari" mengikuti tangkapan layar form
 * SUNGGUHAN KipApp v2.0.4 (2026) yang dikirim pemilik proyek — bukan lagi
 * panduan 2022. Yang ditirukan dan penting:
 *
 * - Label berupa elemen teks terpisah dari kontrolnya, dengan tanda bintang
 *   wajib sebagai elemen sendiri.
 * - Pegawai/Tahun/SKP hanya teks baca tanpa input. SKP kini triwulanan.
 * - Dua checkbox pengalih, "Gunakan periode tanggal" dan "Gunakan jam",
 *   duduk **di baris yang sama** — sengaja, karena inilah yang membuat
 *   pemilihan "kontrol pertama yang ketemu di leluhur" mencentang checkbox
 *   yang salah.
 * - Jam Mulai/Jam Selesai **tidak ada di DOM** sampai "Gunakan jam" dicentang.
 * - Tanggal berupa input teks dengan placeholder "Pilih tanggal", bukan input
 *   date bawaan browser.
 */
function renderFakeKipAppDialog(): void {
  document.body.innerHTML = `
    <div class="modal">
      <h3>Add Capaian Kegiatan Perhari</h3>
      <div class="row"><label>Pegawai:</label><span>[340063146] Nama Pegawai</span></div>
      <div class="row"><label>Tahun:</label><span>2026</span></div>
      <div class="row"><label>SKP:</label><span>1 April - 30 Juni (Triwulan II)</span></div>
      <div class="row"><label><i>*</i> Rencana Kinerja:</label>
        <select id="f-rk">
          <option>Pilih rencana kinerja SKP</option>
          <option>Terlaksananya Kegiatan Statistik Harga sesuai SOP dan tepat waktu.</option>
          <option>Telaksananya Kegiatan Sensus Ekonomi 2026 sesuai SOP dan tepat waktu</option>
        </select>
      </div>
      <div class="row toggles">
        <input id="f-range" type="checkbox" /><span>Gunakan periode tanggal</span>
        <input id="f-usejam" type="checkbox" /><span>Gunakan jam</span>
      </div>
      <div class="row"><label><i>*</i> Tanggal:</label><input id="f-date" type="text" placeholder="Pilih tanggal" /></div>
      <div id="jam-slot"></div>
      <div class="row"><label><i>*</i> Kegiatan:</label><textarea id="f-keg" placeholder="Deskripsi Kegiatan"></textarea></div>
      <div class="row"><label><i>*</i> Progres:</label><input id="f-prog" type="number" value="100" /></div>
      <div class="row"><label><i>*</i> Capaian:</label><textarea id="f-cap" placeholder="Deskripsi Capaian"></textarea></div>
      <div class="row"><label>Data Dukung:</label><input id="f-link" type="text" placeholder="Link Data Dukung" /></div>
      <div class="row"><label>Masukan ke capaian SKP:</label><input id="f-skp" type="checkbox" /></div>
      <button id="f-cancel">Cancel</button>
      <button id="f-save">Save</button>
    </div>`;

  // Meniru perilaku KipApp: field jam baru dibuat saat checkbox dicentang.
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
 * "Rencana Kinerja" dan filter halaman dengan label yang sama persis dengan
 * field di dialog. Ini jebakan yang nyata — tanpa pembatasan lingkup ke
 * dialognya, autofill bisa mengisi filter halaman, bukan formnya.
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
        <select id="page-rk"><option>Pilih rencana kinerja SKP</option></select>
      </div>
      <div class="row"><label>Tanggal</label><input id="page-date" type="text" /></div>
    </div>`;
  document.body.insertBefore(decoy, document.body.firstChild);
}

function runBookmarklet(payload: string): void {
  new Function(AUTOFILL_SCRIPT)();
  const input = document.querySelector<HTMLTextAreaElement>('#kiplog-in')!;
  input.value = payload;
  document.querySelector<HTMLButtonElement>('#kiplog-go')!.click();
}

describe('bookmarklet autofill (skrip yang sebenarnya dikirim, dijalankan di tiruan dialog KipApp)', () => {
  beforeEach(() => {
    renderFakeKipAppDialog();
  });

  it('mengisi kesembilan field dengan mencocokkan teks label yang terlihat', () => {
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));

    expect(document.querySelector<HTMLSelectElement>('#f-rk')!.value).toBe(plan.name);
    expect(document.querySelector<HTMLInputElement>('#f-date')!.value).toBe('2026-08-17');
    expect(document.querySelector<HTMLInputElement>('#f-start')!.value).toBe('08:00');
    expect(document.querySelector<HTMLInputElement>('#f-end')!.value).toBe('11:30');
    expect(document.querySelector<HTMLTextAreaElement>('#f-keg')!.value).toBe(activity.description);
    expect(document.querySelector<HTMLInputElement>('#f-prog')!.value).toBe('100');
    expect(document.querySelector<HTMLTextAreaElement>('#f-cap')!.value).toBe(activity.achievement);
    expect(document.querySelector<HTMLInputElement>('#f-link')!.value).toBe(activity.evidenceLink);
    expect(document.querySelector<HTMLInputElement>('#f-skp')!.checked).toBe(true);
  });

  it('memicu event input dan change supaya framework KipApp ikut memperbarui state-nya', () => {
    const seen: string[] = [];
    document.querySelector('#f-keg')!.addEventListener('input', () => seen.push('input'));
    document.querySelector('#f-keg')!.addEventListener('change', () => seen.push('change'));

    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(seen).toEqual(['input', 'change']);
  });

  it('TIDAK menekan Save', () => {
    const onSave = vi.fn();
    document.querySelector('#f-save')!.addEventListener('click', onSave);
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('mencentang "Gunakan jam" lebih dulu, karena field jam belum ada sebelum itu', () => {
    expect(document.querySelector('#f-start')).toBeNull(); // memang belum ada
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
    expect(document.querySelector<HTMLInputElement>('#f-range')!.checked).toBe(true);
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(document.querySelector<HTMLInputElement>('#f-range')!.checked).toBe(false);
  });

  it('mengirim blur dan Enter setelah mengisi tanggal, karena pemilihnya buatan sendiri', () => {
    const seen: string[] = [];
    const date = document.querySelector('#f-date')!;
    date.addEventListener('keydown', (e) => seen.push(`keydown:${(e as KeyboardEvent).key}`));
    date.addEventListener('blur', () => seen.push('blur'));
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(seen).toContain('keydown:Enter');
    expect(seen).toContain('blur');
  });

  it('melaporkan field yang tidak ditemukan, tidak mendiamkannya', () => {
    document.querySelector('#f-link')!.closest('.row')!.remove();
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('Data Dukung');
    expect(document.querySelector('#kiplog-out')!.textContent).toContain('Gagal');
  });

  it('melaporkan bila nama RK tidak ada di antara opsi select', () => {
    runBookmarklet(
      serializeAutofillPayload(
        buildAutofillPayload(activity, {
          ...plan,
          name: 'RK yang tidak ada di KipApp',
        } as PerformancePlan)
      )
    );
    const out = document.querySelector('#kiplog-out')!.textContent!;
    expect(out).toContain('Rencana Kinerja');
    expect(out).toContain('tidak cocok');
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

    expect(document.querySelector<HTMLSelectElement>('#f-rk')!.value).toBe(plan.name);
    expect(document.querySelector<HTMLInputElement>('#f-date')!.value).toBe('2026-08-17');
    // Kontrol berlabel sama di halaman belakang harus tetap kosong.
    expect(document.querySelector<HTMLSelectElement>('#page-rk')!.value).toBe(
      'Pilih rencana kinerja SKP'
    );
    expect(document.querySelector<HTMLInputElement>('#page-date')!.value).toBe('');
  });
});
