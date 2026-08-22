import { Monitor, Moon, Sun } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import { settingsRepository } from '@/db/repositories';
import { ImagePickerField } from '@/components/common/ImagePickerField';
import type { AppSettings } from '@/types';

interface ThemeFormProps {
  initial?: AppSettings;
}

const MODE_OPTIONS = [
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
  { value: 'system', label: 'Otomatis', icon: Monitor },
] as const;

// Curated (not free-form) so every combination stays legible — each swatch's
// hex mirrors its `--primary` light-mode value in theme.css.
const ACCENT_OPTIONS = [
  { value: 'navy', label: 'Navy', hex: '#0f172a' },
  { value: 'teal', label: 'Teal', hex: '#0f766e' },
  { value: 'indigo', label: 'Indigo', hex: '#4338ca' },
  { value: 'emerald', label: 'Emerald', hex: '#047857' },
  { value: 'orange', label: 'Oranye', hex: '#c2410c' },
  { value: 'gold', label: 'Emas', hex: '#a16207' },
] as const;

// Fitur "kebebasan custom tampilan" — mode terang/gelap/otomatis + warna
// aksen tersimpan per-browser di AppSettings, sama seperti preferensi lain
// di halaman ini (aplikasi ini tidak punya backend/server).
export function ThemeForm({ initial }: ThemeFormProps) {
  async function update(
    patch: Partial<Pick<AppSettings, 'theme' | 'accentColor' | 'appLogoDataUrl'>>
  ) {
    const current = await settingsRepository.get();
    if (!current) return;
    await settingsRepository.save({ ...current, ...patch });
  }

  const theme = initial?.theme ?? 'system';
  const accentColor = initial?.accentColor ?? 'navy';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tampilan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Mode</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => void update({ theme: value })}
                aria-pressed={theme === value}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-control border px-3 py-2.5 text-xs font-medium transition-colors',
                  theme === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input text-muted-foreground hover:bg-accent'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Warna Aksen</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {ACCENT_OPTIONS.map(({ value, label, hex }) => (
              <button
                key={value}
                type="button"
                onClick={() => void update({ accentColor: value })}
                aria-pressed={accentColor === value}
                aria-label={label}
                title={label}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-card transition-shadow',
                  accentColor === value ? 'ring-ring' : 'ring-transparent hover:ring-border'
                )}
              >
                <span
                  className="h-8 w-8 rounded-full border border-black/10"
                  style={{ backgroundColor: hex }}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <ImagePickerField
            label="Logo aplikasi"
            hint="Menggantikan lambang KipLog di sidebar. Kosongkan untuk memakai lambang bawaan."
            value={initial?.appLogoDataUrl}
            onChange={(dataUrl) => void update({ appLogoDataUrl: dataUrl })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
