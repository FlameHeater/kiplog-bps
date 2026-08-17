/**
 * Penjaga host, diuji dari halaman yang BUKAN KipApp.
 *
 * Berkas terpisah karena URL lingkungan jsdom ditentukan per berkas; test
 * autofill utama berjalan di `kipapp.bps.go.id`, yang ini di host lain.
 *
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://contoh-bukan-kipapp.test/form" }
 */
import { describe, expect, it, vi } from 'vitest';
import { AUTOFILL_SCRIPT, KIPAPP_HOSTS } from '@/lib/services/kipapp-autofill';

describe('penjaga host bookmarklet', () => {
  it('menolak berjalan dan tidak menyuntikkan panel apa pun di host lain', () => {
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    document.body.innerHTML = '<div class="row"><label>Tanggal:</label><input id="x" /></div>';

    new Function(AUTOFILL_SCRIPT)();

    expect(alertSpy).toHaveBeenCalledOnce();
    expect(document.getElementById('kiplog-autofill-panel')).toBeNull();
    expect(document.querySelector<HTMLInputElement>('#x')!.value).toBe('');
    vi.unstubAllGlobals();
  });

  it('menyebut kedua host yang diizinkan pada pesan penolakannya', () => {
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);

    new Function(AUTOFILL_SCRIPT)();

    const message = String(alertSpy.mock.calls[0]?.[0] ?? '');
    for (const host of KIPAPP_HOSTS) expect(message).toContain(host);
    vi.unstubAllGlobals();
  });

  it('kedua host resmi ada di daftar — PRD menyebut webapps, pengguna memakai kipapp', () => {
    expect(KIPAPP_HOSTS).toContain('kipapp.bps.go.id');
    expect(KIPAPP_HOSTS).toContain('webapps.bps.go.id');
  });
});
