import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/useSettings';
import { settingsRepository } from '@/db/repositories';

// Quick topbar shortcut for the common case (flip light<->dark). The full
// Terang/Gelap/Otomatis control lives in Pengaturan > Tampilan; this button
// intentionally skips "system" since cycling through it would be confusing
// for a single click.
export function ThemeToggleButton() {
  const settings = useSettings();
  const mode = settings?.theme ?? 'system';
  const isDark =
    mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  async function toggle() {
    const current = await settingsRepository.get();
    if (!current) return;
    await settingsRepository.save({ ...current, theme: isDark ? 'light' : 'dark' });
  }

  if (settings === undefined) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
      onClick={() => void toggle()}
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </Button>
  );
}
