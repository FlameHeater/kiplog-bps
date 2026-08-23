import { useState } from 'react';
import { Link2, Pencil, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthPicker } from '@/components/common/MonthPicker';
import { useMonthlyEvidenceLinks } from '@/hooks/useMonthlyEvidenceLinks';
import { setMonthlyEvidenceLink } from '@/lib/services/monthly-evidence-link';
import { MONTH_NAMES_ID, todayString } from '@/lib/date/date-utils';

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// FR — "rekap" satu link bukti dukung per bulan+tahun: mengisi kegiatan lama
// yang belum bertautan di bulan itu sekaligus (lihat setMonthlyEvidenceLink),
// dan dibaca ActivityForm.tsx untuk mengisi kegiatan BARU secara otomatis —
// dua sisi dari fitur yang sama, bukan dua fitur terpisah.
export function MonthlyEvidenceLinkCard() {
  const entries = useMonthlyEvidenceLinks();
  const [period, setPeriod] = useState(() => todayString().slice(0, 7));
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  function loadForEdit(id: string, currentLink: string) {
    setPeriod(id);
    setLink(currentLink);
    setError(null);
    setConfirmation(null);
  }

  async function save() {
    const trimmed = link.trim();
    if (trimmed && !isValidUrl(trimmed)) {
      setError('Link bukti dukung harus diawali https:// atau http://.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const result = await setMonthlyEvidenceLink(period, trimmed || null);
      setConfirmation(
        trimmed
          ? result.filledCount > 0
            ? `Tersimpan — diterapkan ke ${result.filledCount} kegiatan yang belum bertautan.`
            : 'Tersimpan. Semua kegiatan bulan ini sudah punya link sendiri-sendiri.'
          : 'Link default bulan ini dihapus.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await setMonthlyEvidenceLink(id, null);
    if (period === id) setLink('');
  }

  return (
    <div className="mb-4 rounded-card border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold">Link Bukti Dukung Bulanan</p>
          <p className="text-xs text-muted-foreground">
            Satu link untuk sebulan penuh — otomatis mengisi kegiatan baru dan kegiatan lama yang belum bertautan.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Bulan</label>
          <MonthPicker value={period} onChange={setPeriod} />
        </div>
        <div className="min-w-[16rem] flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Link bukti dukung</label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://drive.google.com/…"
            className="flex h-11 w-full rounded-control border border-input bg-background px-3 text-sm"
          />
        </div>
        <Button type="button" onClick={() => void save()} disabled={saving}>
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          Simpan &amp; Terapkan
        </Button>
      </div>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
      {confirmation ? <p className="mt-1.5 text-xs text-success">{confirmation}</p> : null}

      {entries && entries.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-2 rounded-control border border-border px-2.5 py-1.5 text-xs"
            >
              <span className="shrink-0 font-medium">
                {MONTH_NAMES_ID[entry.month - 1]} {entry.year}
              </span>
              <a
                href={entry.defaultEvidenceLink ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-primary hover:underline"
              >
                {entry.defaultEvidenceLink}
              </a>
              <button
                type="button"
                aria-label={`Ubah link ${MONTH_NAMES_ID[entry.month - 1]} ${entry.year}`}
                onClick={() => loadForEdit(entry.id, entry.defaultEvidenceLink ?? '')}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Hapus link ${MONTH_NAMES_ID[entry.month - 1]} ${entry.year}`}
                onClick={() => void remove(entry.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
