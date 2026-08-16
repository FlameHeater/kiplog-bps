import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Button } from '@/components/ui/button';
import { useActivityModalStore } from '@/features/activities/activity-modal-store';
import { StorageQuotaBanner } from '@/components/common/StorageQuotaBanner';
import { ThemeToggleButton } from '@/components/common/ThemeToggleButton';
import { GlobalSearchDialog } from '@/features/search/GlobalSearchDialog';

// NFR-02/NFR-10 — ActivityFormModal pulls in react-hook-form, zod, and the
// RK matching/fuzzy-search code, none of which is needed for first paint.
// AppShell mounts on every route, so a static import here would put all of
// that in the initial bundle for every page. It's mounted unconditionally
// (matching Dialog's own `open` prop for visibility) so the chunk starts
// fetching as soon as the shell mounts via the Suspense boundary below —
// not lazily on the first click, which would suspend mid-interaction.
const ActivityFormModal = lazy(() =>
  import('@/features/activities/ActivityFormModal').then((m) => ({ default: m.ActivityFormModal }))
);

export function AppShell() {
  const openNew = useActivityModalStore((s) => s.openNew);
  const [searchOpen, setSearchOpen] = useState(false);

  // FR-SCH-01: Ctrl/Cmd+K opens global search from anywhere in the app.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <header className="hidden h-16 shrink-0 items-center justify-between border-b border-border px-8 md:flex">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex w-64 items-center gap-2 rounded-control border border-input px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Cari…
            <kbd className="ml-auto rounded border border-border px-1 text-xs">Ctrl K</kbd>
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <Button onClick={() => openNew()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Kegiatan
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 pb-20 pt-6 md:px-8 md:pb-6">
          <div className="mx-auto max-w-6xl">
            <StorageQuotaBanner />
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
      <Suspense fallback={null}>
        <ActivityFormModal />
      </Suspense>
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
