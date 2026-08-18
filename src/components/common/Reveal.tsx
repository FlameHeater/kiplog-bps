import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface RevealProps {
  children: ReactNode;
  /** Jeda kecil supaya beberapa blok berurutan muncul bertahap, bukan serentak. */
  delayMs?: number;
  className?: string;
}

/**
 * Memunculkan isinya saat tergulir masuk ke layar.
 *
 * Memakai IntersectionObserver, bukan pendengar `scroll`: pendengar scroll
 * berjalan puluhan kali per detik dan memaksa pembacaan tata letak, yang justru
 * membuat gulirannya tersendat — persis kebalikan dari yang diinginkan.
 *
 * Sekali muncul, tidak pernah disembunyikan lagi. Elemen yang memudar setiap
 * kali digulir bolak-balik terasa seperti kerusakan, bukan animasi.
 */
export function Reveal({ children, delayMs = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Lingkungan tanpa IntersectionObserver (mis. jsdom di test) langsung
    // menampilkan isinya — tidak terlihat lebih baik daripada tidak terlihat
    // sama sekali.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setVisible(true);
          observer.disconnect();
        }
      },
      // Dipicu sedikit sebelum benar-benar terlihat, supaya animasinya sudah
      // selesai saat blok itu sampai di tengah pandangan.
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(visible ? 'reveal-visible' : 'reveal', className)}
      style={visible && delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
