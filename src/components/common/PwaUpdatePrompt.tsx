import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';

// PWA-04 — registerType 'prompt' means the new service worker sits waiting
// until the user explicitly reloads; this is that prompt.
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4">
      <div className="flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3 shadow-lg">
        <p className="text-sm">Versi baru tersedia. Muat ulang?</p>
        <Button size="sm" onClick={() => void updateServiceWorker(true)}>
          Muat ulang
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
          Nanti
        </Button>
      </div>
    </div>
  );
}
