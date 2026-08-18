import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Reveal } from '@/components/common/Reveal';

const observers: { callback: IntersectionObserverCallback; disconnect: () => void }[] = [];

function stubObserver() {
  const disconnect = vi.fn();
  class FakeObserver {
    constructor(callback: IntersectionObserverCallback) {
      observers.push({ callback, disconnect });
    }
    observe() {}
    unobserve() {}
    disconnect = disconnect;
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  return disconnect;
}

function scrollIntoView() {
  // Dibungkus act(): callback observer datang dari luar React, jadi tanpa ini
  // perubahan state-nya tidak pernah ter-render saat pemeriksaan dijalankan.
  act(() => {
    const entry = { isIntersecting: true } as IntersectionObserverEntry;
    observers.at(-1)!.callback([entry], {} as IntersectionObserver);
  });
}

afterEach(() => {
  observers.length = 0;
  vi.unstubAllGlobals();
});

describe('Reveal', () => {
  it('menyembunyikan isinya sampai tergulir masuk ke layar', () => {
    stubObserver();
    render(
      <Reveal>
        <p>Ringkasan mingguan</p>
      </Reveal>
    );
    // Isinya tetap ada di DOM — hanya belum tampak — supaya pembaca layar dan
    // pencarian dalam halaman tidak kehilangan apa pun.
    expect(screen.getByText('Ringkasan mingguan')).toBeInTheDocument();
    expect(screen.getByText('Ringkasan mingguan').parentElement).toHaveClass('reveal');
  });

  it('memunculkan isinya saat tergulir masuk', () => {
    stubObserver();
    render(
      <Reveal>
        <p>Ringkasan mingguan</p>
      </Reveal>
    );
    scrollIntoView();
    expect(screen.getByText('Ringkasan mingguan').parentElement).toHaveClass('reveal-visible');
  });

  it('berhenti mengamati setelah muncul, dan tidak menyembunyikannya lagi', () => {
    // Elemen yang memudar tiap kali digulir bolak-balik terasa seperti
    // kerusakan, bukan animasi.
    const disconnect = stubObserver();
    render(
      <Reveal>
        <p>Ringkasan mingguan</p>
      </Reveal>
    );
    scrollIntoView();
    expect(disconnect).toHaveBeenCalled();

    act(() => {
      observers
        .at(-1)!
        .callback(
          [{ isIntersecting: false } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
    });
    expect(screen.getByText('Ringkasan mingguan').parentElement).toHaveClass('reveal-visible');
  });

  it('langsung menampilkan isinya di lingkungan tanpa IntersectionObserver', () => {
    // Tidak terlihat sama sekali jauh lebih buruk daripada muncul tanpa animasi.
    vi.stubGlobal('IntersectionObserver', undefined);
    render(
      <Reveal>
        <p>Ringkasan mingguan</p>
      </Reveal>
    );
    expect(screen.getByText('Ringkasan mingguan').parentElement).toHaveClass('reveal-visible');
  });
});
