import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils/cn';
import { NAV_ITEMS } from './navigation';
import { useUnassignedEvidenceCount } from '@/hooks/useAllEvidence';

// §14.8: 768–1279px shrinks to icon-only; ≥1280px shows the full labeled sidebar.
export function Sidebar() {
  const unassignedCount = useUnassignedEvidenceCount();

  return (
    <aside className="hidden shrink-0 border-r border-border/60 bg-card md:flex md:w-16 md:flex-col xl:w-60">
      <div className="flex h-16 items-center justify-center gap-2 px-2 xl:justify-start xl:px-6">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-gradient-primary text-sm font-bold text-primary-foreground shadow-sm"
          aria-hidden="true"
        >
          K
        </span>
        <span className="hidden text-lg font-semibold tracking-tight xl:inline">KipLog</span>
      </div>
      <nav className="flex-1 space-y-1 px-2 xl:px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            title={item.label}
            aria-label={item.label}
            className={({ isActive }) =>
              cn(
                'relative flex items-center justify-center gap-3 rounded-control px-2 py-2 text-sm font-medium transition-colors xl:justify-start xl:px-3',
                isActive
                  ? 'bg-primary/10 text-primary before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-primary xl:before:content-[""]'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden flex-1 xl:inline">{item.label}</span>
            {/* FR-INB-06 */}
            {item.to === '/evidence-inbox' && unassignedCount > 0 ? (
              <span className="hidden rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground xl:inline-block">
                {unassignedCount}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
