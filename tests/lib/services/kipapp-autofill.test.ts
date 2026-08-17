/**
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://webapps.bps.go.id/kipapp/" }
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
    expect(buildAutofillPayload({ ...activity, performancePlanId: null }, null).rencanaKinerja).toBeNull();
  });
});

describe('autofillBlockedReason', () => {
  it('menolak kegiatan yang sudah dikirim untuk dinilai', () => {
    // Panduan hal. 68: yang sudah dikirim tidak bisa dibatalkan atau diedit.
    expect(autofillBlockedReason({ ...activity, sentForReview: true })).toMatch(/dikirim untuk dinilai/i);
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
 * Tiruan dialog "Add Capaian Kegiatan Perhari" mengikuti tangkapan layar
 * panduan hal. 66: label sebagai elemen teks terpisah dari kontrolnya, tanda
 * bintang wajib di depan, dan tiga field teratas (Pegawai/Tahun/SKP) hanya
 * teks baca tanpa input.
 */
function renderFakeKipAppDialog(): void {
  document.body.innerHTML = `
    <div class="modal">
      <h3>Add Capaian Kegiatan Perhari</h3>
      <div class="row"><label>Pegawai:</label><span>[340015817] Nama Pegawai</span></div>
      <div class="row"><label>Tahun:</label><span>2026</span></div>
      <div class="row"><label>SKP:</label><span>1 Agustus - 31 Agustus (Bulan Agustus)</span></div>
      <div class="row"><label>* Rencana Kinerja:</label>
        <select id="f-rk">
          <option>Pilih rencana kinerja SKP</option>
          <option>Terlaksananya Kegiatan Statistik Harga sesuai SOP dan tepat waktu.</option>
          <option>Telaksananya Kegiatan Sensus Ekonomi 2026 sesuai SOP dan tepat waktu</option>
        </select>
      </div>
      <div class="row"><label>* Tanggal:</label><input id="f-date" type="date" /></div>
      <div class="row"><label>* Jam Mulai:</label><input id="f-start" type="time" /></div>
      <div class="row"><label>* Jam Selesai:</label><input id="f-end" type="time" /></div>
      <div class="row"><label>* Kegiatan:</label><textarea id="f-keg"></textarea></div>
      <div class="row"><label>* Progres:</label><input id="f-prog" type="number" /></div>
      <div class="row"><label>* Capaian:</label><textarea id="f-cap"></textarea></div>
      <div class="row"><label>Data Dukung:</label><input id="f-link" type="text" /></div>
      <div class="row"><label>Masukan ke capaian SKP:</label><input id="f-skp" type="checkbox" /></div>
      <button id="f-cancel">Cancel</button>
      <button id="f-save">Save</button>
    </div>`;
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
    document
      .querySelector('#f-keg')!
      .addEventListener('input', () => seen.push('input'));
    document
      .querySelector('#f-keg')!
      .addEventListener('change', () => seen.push('change'));

    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(seen).toEqual(['input', 'change']);
  });

  it('TIDAK menekan Save', () => {
    const onSave = vi.fn();
    document.querySelector('#f-save')!.addEventListener('click', onSave);
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(activity, plan)));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('melewati jam yang tidak dicatat alih-alih mengisinya dengan string kosong', () => {
    const noTime = { ...activity, startTime: '', endTime: '' };
    runBookmarklet(serializeAutofillPayload(buildAutofillPayload(noTime, plan)));
    expect(document.querySelector<HTMLInputElement>('#f-start')!.value).toBe('');
    expect(document.querySelector<HTMLTextAreaElement>('#f-keg')!.value).toBe(noTime.description);
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
        buildAutofillPayload(activity, { ...plan, name: 'RK yang tidak ada di KipApp' } as PerformancePlan)
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
});
