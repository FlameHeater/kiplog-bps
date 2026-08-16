import type { LinkProvider } from '@/types';

// FR-EVD-10 — best-effort provider detection from the URL host, purely for
// picking a display icon. Never fetches the URL or its contents.
export function detectLinkProvider(url: string): LinkProvider {
  try {
    const host = new URL(url).hostname;
    if (host.includes('drive.google.com') || host.includes('docs.google.com')) return 'gdrive';
    if (host.includes('onedrive.live.com') || host.includes('1drv.ms')) return 'onedrive';
    if (host.includes('sharepoint.com')) return 'sharepoint';
    if (host === 'localhost' || host.endsWith('.local')) return 'internal';
    return 'other';
  } catch {
    return 'other';
  }
}
