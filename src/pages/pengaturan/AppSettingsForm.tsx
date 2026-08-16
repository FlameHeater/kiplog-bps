import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { settingsRepository } from '@/db/repositories';
import type { AppSettings } from '@/types';
import { HOLIDAYS_ID_2026_SEED } from '@/data/holidays-id';
import { SCHEMA_VERSION } from '@/lib/version';

const WEEKDAY_LABELS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];

interface AppSettingsFormProps {
  initial?: AppSettings;
}

// FR-DAT-12, §12.4 seed. Hari libur diedit manual — daftar seed belum final (docs/ASSUMPTIONS.md).
export function AppSettingsForm({ initial }: AppSettingsFormProps) {
  const [workdays, setWorkdays] = useState<number[]>(initial?.workdays ?? [1, 2, 3, 4, 5]);
  const [holidays, setHolidays] = useState<string[]>(initial?.holidays ?? HOLIDAYS_ID_2026_SEED);
  const [newHoliday, setNewHoliday] = useState('');
  const [requireEvidenceForReady, setRequireEvidenceForReady] = useState(
    initial?.requireEvidenceForReady ?? true
  );
  const [requireEvidenceLinkForReady, setRequireEvidenceLinkForReady] = useState(
    initial?.requireEvidenceLinkForReady ?? true
  );
  const [monthEndReminderDays, setMonthEndReminderDays] = useState(
    initial?.monthEndReminderDays ?? 5
  );
  const [defaultDriveFolderUrl, setDefaultDriveFolderUrl] = useState(initial?.defaultDriveFolderUrl ?? '');
  const [saving, setSaving] = useState(false);

  function toggleWorkday(day: number) {
    setWorkdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function addHoliday() {
    if (/^\d{4}-\d{2}-\d{2}$/.test(newHoliday) && !holidays.includes(newHoliday)) {
      setHolidays((prev) => [...prev, newHoliday].sort());
      setNewHoliday('');
    }
  }

  async function save() {
    setSaving(true);
    await settingsRepository.save({
      id: 'settings',
      workdays,
      holidays,
      requireEvidenceForReady,
      requireEvidenceLinkForReady,
      defaultStartTime: initial?.defaultStartTime ?? '08:00',
      defaultEndTime: initial?.defaultEndTime ?? '16:00',
      defaultCountsTowardSkp: initial?.defaultCountsTowardSkp ?? true,
      theme: initial?.theme ?? 'system',
      accentColor: initial?.accentColor ?? 'navy',
      maxFileSizeMb: initial?.maxFileSizeMb ?? 10,
      autoCompressImages: initial?.autoCompressImages ?? true,
      monthEndReminderDays,
      defaultDriveFolderUrl: defaultDriveFolderUrl.trim() === '' ? null : defaultDriveFolderUrl.trim(),
      lastBackupAt: initial?.lastBackupAt ?? null,
      schemaVersion: initial?.schemaVersion ?? SCHEMA_VERSION,
    });
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Hari Kerja</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWorkday(day)}
                className={
                  'rounded-control border px-3 py-1.5 text-sm ' +
                  (workdays.includes(day)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input text-muted-foreground')
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Hari Libur Nasional ({holidays.length})</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Seed awal belum final — verifikasi terhadap SKB 3 Menteri tahun berjalan.
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              type="date"
              value={newHoliday}
              onChange={(e) => setNewHoliday(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={addHoliday}>
              Tambah
            </Button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {holidays.map((h) => (
              <li
                key={h}
                className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs"
              >
                {h}
                <button
                  type="button"
                  aria-label={`Hapus ${h}`}
                  onClick={() => setHolidays((prev) => prev.filter((x) => x !== h))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="req-evidence">Wajib ada bukti dukung untuk Ready to Report</Label>
          </div>
          <Switch
            id="req-evidence"
            checked={requireEvidenceForReady}
            onCheckedChange={setRequireEvidenceForReady}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="req-evidence-link">Wajib ada Link Bukti Dukung untuk Ready to Report</Label>
          </div>
          <Switch
            id="req-evidence-link"
            checked={requireEvidenceLinkForReady}
            onCheckedChange={setRequireEvidenceLinkForReady}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reminder-days">Hitung mundur akhir bulan mulai (hari sebelum)</Label>
          <Input
            id="reminder-days"
            type="number"
            min={1}
            max={15}
            value={monthEndReminderDays}
            onChange={(e) => setMonthEndReminderDays(Number(e.target.value))}
            className="w-24"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="drive-folder">Tautan Folder Drive Bukti Dukung (opsional)</Label>
          <Input
            id="drive-folder"
            type="url"
            placeholder="https://drive.google.com/…"
            value={defaultDriveFolderUrl}
            onChange={(e) => setDefaultDriveFolderUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Hanya pintasan pembuka folder — KipLog tidak pernah mengunggah berkas ke sana.
          </p>
        </div>

        <Button onClick={save} disabled={saving}>
          Simpan Pengaturan
        </Button>
      </CardContent>
    </Card>
  );
}
