import { useEffect } from 'react';
import { useSettings } from './useSettings';

function resolveIsDark(mode: 'light' | 'dark' | 'system', systemPrefersDark: boolean): boolean {
  if (mode === 'system') return systemPrefersDark;
  return mode === 'dark';
}

// Applies `settings.theme`/`settings.accentColor` to <html> as a `dark` class
// + `data-accent` attribute, which is what src/styles/theme.css keys its
// `.dark`/`[data-accent="..."]` token overrides off. Runs once near the app
// root (see App.tsx) so every page picks up the chosen look without each
// page having to read settings itself.
export function useAppliedTheme(): void {
  const settings = useSettings();
  const mode = settings?.theme ?? 'system';
  const accent = settings?.accentColor ?? 'navy';

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    function apply() {
      root.classList.toggle('dark', resolveIsDark(mode, media.matches));
      root.dataset.accent = accent;
    }

    apply();

    if (mode !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode, accent]);
}
