import {
  LayoutDashboard,
  Calendar,
  ListChecks,
  Inbox,
  Link2,
  Target,
  FileStack,
  ClipboardCheck,
  FileOutput,
  CalendarCheck,
  DatabaseBackup,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  inBottomNav?: boolean;
}

// PRD §14.3 — single source of truth for the sitemap's nav labels/order.
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, inBottomNav: true },
  { to: '/kalender', label: 'Kalender', icon: Calendar, inBottomNav: true },
  { to: '/kegiatan', label: 'Kegiatan', icon: ListChecks, inBottomNav: true },
  { to: '/evidence-inbox', label: 'Evidence Inbox', icon: Inbox, inBottomNav: true },
  { to: '/bukti-tautan', label: 'Bukti & Tautan', icon: Link2 },
  { to: '/rencana-kinerja', label: 'Rencana Kinerja', icon: Target },
  { to: '/template', label: 'Template', icon: FileStack },
  { to: '/kipapp-ready', label: 'KipApp Ready', icon: ClipboardCheck },
  { to: '/laporan', label: 'Laporan', icon: FileOutput },
  { to: '/review', label: 'Monthly Review', icon: CalendarCheck },
  { to: '/backup', label: 'Backup & Import', icon: DatabaseBackup },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
];
