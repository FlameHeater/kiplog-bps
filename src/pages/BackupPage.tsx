import { useRef, useState } from 'react';
import { AlertTriangle, Archive, FileJson, FileSpreadsheet, Upload } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorBanner } from '@/components/common/ErrorBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/hooks/useSettings';
import { useActivities } from '@/hooks/useActivities';
import { formatIndonesianDate, todayString } from '@/lib/date/date-utils';
import { downloadBlob } from '@/lib/utils/download-blob';
import {
  computeImportImpact,
  deleteAllData,
  executeImport,
  exportBackupJson,
  exportBackupZip,
  parseBackupFile,
  type ImportImpact,
  type ImportMode,
  type ParsedBackup,
} from '@/lib/services/backup';
import {
  guessColumnIndex,
  parseKipAppExcelFile,
  reconcileWithLocalActivities,
  type ParsedKipAppSheet,
  type ReconciliationRow,
} from '@/lib/services/kipapp-import';

// FR-DAT-07…11.
export function BackupPage() {
  const settings = useSettings();
  const activities = useActivities();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kipAppFileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState<'json' | 'zip' | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [impact, setImpact] = useState<ImportImpact | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDone, setDeleteDone] = useState(false);

  const [kipAppSheet, setKipAppSheet] = useState<ParsedKipAppSheet | null>(null);
  const [kipAppError, setKipAppError] = useState<string | null>(null);
  const [dateColumn, setDateColumn] = useState<number | null>(null);
  const [descriptionColumn, setDescriptionColumn] = useState<number | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationRow[] | null>(null);

  async function handleExportJson() {
    setIsExporting('json');
    try {
      const { blob, filename } = await exportBackupJson();
      downloadBlob(blob, filename);
    } finally {
      setIsExporting(null);
    }
  }

  async function handleExportZip() {
    setIsExporting('zip');
    try {
      const { blob, filename } = await exportBackupZip();
      downloadBlob(blob, filename);
    } finally {
      setIsExporting(null);
    }
  }

  async function handleFileSelected(file: File) {
    setImportError(null);
    setImportDone(false);
    try {
      const result = await parseBackupFile(file);
      setParsed(result);
      setImpact(await computeImportImpact(result.payload, importMode));
    } catch (err) {
      setParsed(null);
      setImpact(null);
      setImportError(err instanceof Error ? err.message : 'Gagal membaca berkas backup.');
    }
  }

  async function handleModeChange(mode: ImportMode) {
    setImportMode(mode);
    if (parsed) setImpact(await computeImportImpact(parsed.payload, mode));
  }

  async function confirmImport() {
    if (!parsed) return;
    setIsImporting(true);
    try {
      await executeImport(parsed, importMode);
      setImportDone(true);
      setParsed(null);
      setImpact(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsImporting(false);
    }
  }

  async function handleKipAppFileSelected(file: File) {
    setKipAppError(null);
    setReconciliation(null);
    setKipAppSheet(null);
    try {
      const sheet = await parseKipAppExcelFile(file);
      setKipAppSheet(sheet);
      const guessedDate = guessColumnIndex(sheet.headers, ['tanggal', 'date']);
      const guessedDescription = guessColumnIndex(sheet.headers, ['uraian', 'kegiatan', 'deskripsi']);
      setDateColumn(guessedDate);
      setDescriptionColumn(guessedDescription);
      if (guessedDate === null || guessedDescription === null) {
        setKipAppError('Struktur kolom tidak dikenali. Petakan kolom secara manual pada langkah berikutnya.');
      }
    } catch (err) {
      setKipAppError(err instanceof Error ? err.message : 'Struktur kolom tidak dikenali. Petakan kolom secara manual pada langkah berikutnya.');
    }
  }

  function runReconciliation() {
    if (!kipAppSheet || dateColumn === null || descriptionColumn === null) return;
    setReconciliation(
      reconcileWithLocalActivities(kipAppSheet, { dateColumn, descriptionColumn }, activities ?? [])
    );
  }

  async function confirmDelete() {
    setIsDeleting(true);
    try {
      await deleteAllData();
      setDeleteDone(true);
      setDeleteConfirmText('');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Backup & Import" description="Seluruh data KipLog tersimpan lokal di perangkat ini — cadangkan secara rutin." />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {settings?.lastBackupAt
                ? `Backup terakhir: ${formatIndonesianDate(settings.lastBackupAt.slice(0, 10))}`
                : 'Belum pernah backup.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={isExporting !== null} onClick={() => void handleExportJson()}>
                <FileJson className="h-4 w-4" aria-hidden="true" />
                {isExporting === 'json' ? 'Membuat…' : 'Backup Ringan (JSON)'}
              </Button>
              <Button variant="outline" disabled={isExporting !== null} onClick={() => void handleExportZip()}>
                <Archive className="h-4 w-4" aria-hidden="true" />
                {isExporting === 'zip' ? 'Membuat…' : 'Backup Lengkap (ZIP + Berkas)'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Backup Ringan (JSON) berisi seluruh data kecuali berkas bukti dukung. Backup Lengkap (ZIP) menyertakan
              berkas bukti dukung apa adanya — gunakan ini untuk cadangan penuh.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="import-file">Pilih berkas backup (.json atau .zip)</Label>
              <input
                id="import-file"
                ref={fileInputRef}
                type="file"
                accept=".json,.zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileSelected(file);
                }}
                className="block w-full text-sm"
              />
            </div>

            {importError ? <p className="text-sm text-destructive">{importError}</p> : null}
            {importDone ? <p className="text-sm text-success">Import berhasil diterapkan.</p> : null}

            {parsed && impact ? (
              <div className="space-y-3 rounded-card border border-border p-3">
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={importMode === 'merge'}
                      onChange={() => void handleModeChange('merge')}
                    />
                    Gabungkan (lewati ID duplikat)
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={importMode === 'replace'}
                      onChange={() => void handleModeChange('replace')}
                    />
                    Ganti seluruh data
                  </label>
                </div>

                {importMode === 'replace' ? (
                  <p className="text-xs text-warning">
                    Seluruh data saat ini akan DIHAPUS dan diganti dengan isi backup ini.
                  </p>
                ) : null}

                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-1">Entitas</th>
                      <th className="py-1 text-right">Di backup</th>
                      <th className="py-1 text-right">Ditambahkan</th>
                      <th className="py-1 text-right">Dilewati</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        ['Rencana Kinerja', impact.counts.performancePlans],
                        ['Kegiatan', impact.counts.activities],
                        ['Bukti Dukung', impact.counts.evidence],
                        ['Template', impact.counts.templates],
                        ['Periode SKP', impact.counts.skpPeriods],
                      ] as const
                    ).map(([label, c]) => (
                      <tr key={label} className="border-t border-border">
                        <td className="py-1">{label}</td>
                        <td className="py-1 text-right">{c.inBackup}</td>
                        <td className="py-1 text-right">{c.toAdd}</td>
                        <td className="py-1 text-right">{c.toSkip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <Button size="sm" disabled={isImporting} onClick={() => void confirmImport()}>
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  {isImporting ? 'Menerapkan…' : 'Terapkan Import'}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Import Excel Pelaksanaan dari KipApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Unggah berkas Excel dari menu Download Excel pada submenu Pelaksanaan di KipApp untuk melihat kegiatan
            mana yang sudah tercatat di KipLog dan mana yang belum. Ini hanya menampilkan hasil perbandingan — tidak
            ada data yang ditambahkan atau diubah secara otomatis.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="kipapp-file">Pilih berkas Excel KipApp (.xlsx)</Label>
            <input
              id="kipapp-file"
              ref={kipAppFileInputRef}
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleKipAppFileSelected(file);
              }}
              className="block w-full text-sm"
            />
          </div>

          {kipAppError ? <ErrorBanner message={kipAppError} onDismiss={() => setKipAppError(null)} /> : null}

          {kipAppSheet ? (
            <div className="space-y-3 rounded-card border border-border p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="kipapp-date-col">Kolom Tanggal</Label>
                  <select
                    id="kipapp-date-col"
                    className="flex h-11 w-full rounded-control border border-input bg-background px-3 text-sm"
                    value={dateColumn ?? ''}
                    onChange={(e) => setDateColumn(e.target.value === '' ? null : Number(e.target.value))}
                  >
                    <option value="">Pilih kolom…</option>
                    {kipAppSheet.headers.map((header, idx) => (
                      <option key={idx} value={idx}>
                        {header || `Kolom ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kipapp-desc-col">Kolom Uraian Kegiatan</Label>
                  <select
                    id="kipapp-desc-col"
                    className="flex h-11 w-full rounded-control border border-input bg-background px-3 text-sm"
                    value={descriptionColumn ?? ''}
                    onChange={(e) => setDescriptionColumn(e.target.value === '' ? null : Number(e.target.value))}
                  >
                    <option value="">Pilih kolom…</option>
                    {kipAppSheet.headers.map((header, idx) => (
                      <option key={idx} value={idx}>
                        {header || `Kolom ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                size="sm"
                disabled={dateColumn === null || descriptionColumn === null}
                onClick={runReconciliation}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                Bandingkan dengan KipLog
              </Button>
            </div>
          ) : null}

          {reconciliation ? (
            <div className="space-y-3">
              <p className="text-sm">
                {reconciliation.filter((r) => r.matched).length} dari {reconciliation.length} kegiatan di berkas
                KipApp sudah tercatat di KipLog.
              </p>
              {reconciliation.some((r) => !r.matched) ? (
                <div className="max-h-64 overflow-y-auto rounded-card border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card text-left text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1">Tanggal</th>
                        <th className="px-2 py-1">Uraian Kegiatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliation
                        .filter((r) => !r.matched)
                        .map((r, idx) => (
                          <tr key={idx} className="border-t border-border">
                            <td className="px-2 py-1">{r.date}</td>
                            <td className="px-2 py-1">{r.description}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-success">Seluruh kegiatan di KipApp sudah tercatat di KipLog.</p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-6 border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Hapus Semua Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Menghapus seluruh profil, Rencana Kinerja, kegiatan, bukti dukung, template, dan pengaturan secara
            permanen dari perangkat ini. Tindakan ini tidak dapat dibatalkan — buat backup terlebih dahulu.
          </p>
          {deleteDone ? (
            <p className="text-sm text-success">Seluruh data telah dihapus.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="delete-confirm" className="sr-only">
                Ketik HAPUS untuk konfirmasi
              </Label>
              <Input
                id="delete-confirm"
                className="w-40"
                placeholder="Ketik HAPUS"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
              <Button
                variant="destructive"
                disabled={deleteConfirmText !== 'HAPUS' || isDeleting}
                onClick={() => void confirmDelete()}
              >
                {isDeleting ? 'Menghapus…' : 'Hapus Semua Data'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">Hari ini: {formatIndonesianDate(todayString())}</p>
    </div>
  );
}
