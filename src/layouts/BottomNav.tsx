import { NavLink } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { NAV_ITEMS } from './navigation';
import { useActivityModalStore } from '@/features/activities/activity-modal-store';
import { useUnassignedEvidenceCount } from '@/hooks/useAllEvidence';

// PRD §14.3 — mobile bottom nav: Dashboard, Kalender, + Tambah (FAB tengah), Evidence, Kegiatan.
export function BottomNav() {
  const openNew = useActivityModalStore((s) => s.openNew);
  const unassignedCount = useUnassignedEvidenceCount();
  const items = NAV_ITEMS.filter((item) => item.inBottomNav);
  const [dashboard, kalender, evidenceInbox, kegiatan] = items;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center justify-around border-t border-border bg-card md:hidden">
      {[dashboard, kalender].map((item) =>
        item ? (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 text-xs',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ) : null
      )}

      <button
        type="button"
        aria-label="Tambah Kegiatan"
        onClick={() => openNew()}
        className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>

      {[evidenceInbox, kegiatan].map((item) =>
        item ? (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center gap-1 text-xs',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
            {item.to === '/evidence-inbox' && unassignedCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                {unassignedCount}
              </span>
            ) : null}
          </NavLink>
        ) : null
      )}
    </nav>
  );
}
