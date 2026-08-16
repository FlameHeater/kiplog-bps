import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { StorageBlockedMessage } from '@/components/common/StorageBlockedMessage';
import { checkIndexedDbAvailable } from '@/lib/utils/check-indexeddb';
import '@/styles/theme.css';

// §22.3 — minimal root-level error boundary so a render error shows a
// recoverable message instead of a silently blank page.
class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-sm font-medium text-destructive">Terjadi kesalahan tak terduga.</p>
          <p className="text-xs text-muted-foreground">Muat ulang halaman. Data Anda tetap aman di penyimpanan lokal.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

const root = createRoot(container);

// §17.1 — the app is gated behind a real IndexedDB probe instead of letting
// Dexie fail deep inside a repository call with a raw error, but the probe
// itself is async: render the real app tree synchronously right away (NFR-01
// first paint) and only swap to the blocked-storage message if the probe
// later comes back negative, instead of blocking every paint on it.
root.render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);

void checkIndexedDbAvailable().then((available) => {
  if (available) return;
  root.render(
    <StrictMode>
      <StorageBlockedMessage />
    </StrictMode>
  );
});
