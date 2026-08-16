import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FolderOpen, FileText, Link2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorBanner } from '@/components/common/ErrorBanner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useActivities } from '@/hooks/useActivities';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';
import { useAllEvidence } from '@/hooks/useAllEvidence';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSettings } from '@/hooks/useSettings';
import { activityRepository } from '@/db/repositories';
import { formatIndonesianDate } from '@/lib/date/date-utils';
import { generateDataDukungPdf } from '@/lib/reporting/pdf-data-dukung';
import { buildReportFilename } from '@/lib/reporting/filename';
import { monthRangeContaining } from '@/lib/reporting/report-period';
import { MonthPicker } from '@/components/common/MonthPicker';
import { groupEvidenceByActivity } from '@/lib/services/evidence-grouping';
import { downloadBlob } from '@/lib/utils/download-blob';
import type { Activity, EvidenceLinkStatus } from '@/types';

const COLUMNS: { status: EvidenceLinkStatus; label: string }[] = [
  { status: 'none', label: 'Belum ada bukti' },
  { status: 'collected', label: 'Bukti terkumpul' },
  { status: 'packaged', label: 'Berkas dibuat' },
  { status: 'uploaded', label: 'Tautan tersimpan' },
];

// §10.13 FR-LNK-01…07 — fitur pembeda inti: rapikan alur bukti dukung → berkas → tautan.
export function BuktiTautanPage() {
  const activities = useActivities();
  const plans = usePerformancePlans();
  const evidence = useAllEvidence();
  const profile = useUserProfile();
  const settings = useSettings();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);
  const [bulkPaste, setBulkPaste] = useState('');
  const [sameLinkUrl, setSameLinkUrl] = useState('');
  const [linkValues, setLinkValues] = useState<Record<string, string>>({});
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectMonth, setSelectMonth] = useState('');

  const planById = useMemo(() => new Map((plans ?? []).map((p) => [p.id, p])), [plans]);
  const evidenceByActivityId = useMemo(() => groupEvidenceByActivity(evidence ?? []), [evidence]);

  const byColumn = useMemo(() => {
    const map = new Map<EvidenceLinkStatus, Activity[]>();
    for (const col of COLUMNS) map.set(col.status, []);
    for (const activity of activities ?? []) {
      map.get(activity.evidenceLinkStatus)?.push(activity);
    }
    for (const list of map.values()) list.sort((a, b) => b.date.localeCompare(a.date));
    return map;
  }, [activities]);

  const selected = useMemo(
    () => (activities ?? []).filter((a) => selectedIds.has(a.id)),
    [activities, selectedIds]
  );

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  // Lets the user select a whole month's activities in one click instead of
  // checking each card individually — the user's own example was "langsung
  // satu bulan" (a whole month at once).
  function selectAllInMonth() {
    if (!selectMonth) return;
    const { start, end } = monthRangeContaining(`${selectMonth}-01`);
    const ids = (activities ?? []).filter((a) => a.date >= start && a.date <= end).map((a) => a.id);
    setSelectedIds(new Set(ids));
  }

  // FR-LNK-02: one PDF per selected activity, then move each to 'packaged'.
  async function handleBuatBerkas() {
    if (!profile || selected.length === 0) return;
    setIsGenerating(true);
    setError(null);
    try {
      for (const activity of selected) {
        const blob = await generateDataDukungPdf(
          [{ activity, plan: activity.performancePlanId ? (planById.get(activity.performancePlanId) ?? null) : null, evidence: evidenceByActivityId.get(activity.id) ?? [] }],
          profile
        );
        downloadBlob(blob, buildReportFilename('DataDukung', activity.date.split('-').join(''), 'pdf'));
        await activityRepository.update(activity.id, { evidenceLinkStatus: 'packaged' });
      }
      setShowGuidance(true);
    } catch {
      setError('Gagal membuat PDF. Coba periode lebih pendek atau kurangi bukti bergambar.');
    } finally {
      setIsGenerating(false);
    }
  }

  function openLinkDialog() {
    const initial: Record<string, string> = {};
    for (const activity of selected) initial[activity.id] = activity.evidenceLink ?? '';
    setLinkValues(initial);
    setLinkErrors({});
    setBulkPaste('');
    setSameLinkUrl('');
    setLinkDialogOpen(true);
  }

  // Fills every selected row with the SAME url — for when one Drive
  // folder/file link covers the whole batch, as opposed to applyBulkPaste
  // below which expects one distinct url per row.
  function applySameLinkToAll() {
    const value = sameLinkUrl.trim();
    if (!value) return;
    const next = { ...linkValues };
    for (const activity of selected) next[activity.id] = value;
    setLinkValues(next);
  }

  // FR-LNK-04: pasting many URLs at once fills the rows in list order.
  function applyBulkPaste(text: string) {
    setBulkPaste(text);
    const urls = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const next = { ...linkValues };
    selected.forEach((activity, i) => {
      if (urls[i]) next[activity.id] = urls[i] as string;
    });
    setLinkValues(next);
  }

  function isValidUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  async function confirmLinks() {
    const errors: Record<string, string> = {};
    for (const activity of selected) {
      const value = (linkValues[activity.id] ?? '').trim();
      if (value && !isValidUrl(value)) errors[activity.id] = 'Link bukti dukung harus diawali https:// atau http://.';
    }
    setLinkErrors(errors);
    if (Object.keys(errors).length > 0) return;

    await Promise.all(
      selected.map((activity) => {
        const value = (linkValues[activity.id] ?? '').trim();
        if (!value) return Promise.resolve();
        return activityRepository.update(activity.id, { evidenceLink: value, evidenceLinkStatus: 'uploaded' });
      })
    );
    setLinkDialogOpen(false);
    setSelectedIds(new Set());
    setShowGuidance(false);
  }

  if (activities === undefined) return null;

  const hasEvidenceInSelection = selected.some((a) => (evidenceByActivityId.get(a.id) ?? []).length > 0);

  return (
    <div>
      <PageHeader
        title="Bukti & Tautan"
        description="Rapikan bukti dukung menjadi berkas, lalu catat tautannya di sini setelah Anda unggah manual ke Drive."
        actions={
          settings?.defaultDriveFolderUrl ? (
            <Button variant="outline" size="sm" onClick={() => window.open(settings.defaultDriveFolderUrl as string, '_blank', 'noopener')}>
              <FolderOpen className="h-4 w-4" aria-hidden="true" />
              Buka Folder Drive
            </Button>
          ) : undefined
        }
      />

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      {activities.length === 0 ? (
        <EmptyState
          title="Semua kegiatan sudah punya Link Bukti Dukung."
          action={
            <Link to="/laporan">
              <Button>Lihat Laporan</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Pilih cepat:</span>
            <MonthPicker value={selectMonth} onChange={setSelectMonth} clearable />
            <Button size="sm" variant="outline" disabled={!selectMonth} onClick={selectAllInMonth}>
              Pilih semua di bulan ini
            </Button>
          </div>

          {selected.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-card border border-border bg-secondary/50 p-3">
              <span className="text-sm font-medium">{selected.length} kegiatan dipilih</span>
              <Button size="sm" disabled={isGenerating || !hasEvidenceInSelection} onClick={() => void handleBuatBerkas()}>
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                {isGenerating ? 'Membuat berkas…' : 'Buat Berkas Data Dukung'}
              </Button>
              <Button size="sm" variant="outline" onClick={openLinkDialog}>
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                Tempel Tautan Massal
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                Batal pilih
              </Button>
            </div>
          ) : null}

          {showGuidance ? (
            <div className="mb-4 rounded-card border border-info/40 bg-info/5 p-4 text-sm">
              <p className="font-medium text-info">Langkah selanjutnya (§10.13 — KipLog tidak mengunggah apa pun sendiri):</p>
              <ol className="ml-4 mt-1 list-decimal space-y-0.5 text-muted-foreground">
                <li>Berkas PDF sudah terunduh ke perangkat Anda.</li>
                <li>Unggah berkas itu ke folder Drive Anda sendiri.</li>
                <li>
                  Tempel tautannya di sini via{' '}
                  <button type="button" className="text-primary underline" onClick={openLinkDialog}>
                    Tempel Tautan Massal
                  </button>
                  .
                </li>
              </ol>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.status} className="min-w-0">
                <h3 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
                  {col.label}
                  <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-normal">
                    {byColumn.get(col.status)?.length ?? 0}
                  </span>
                </h3>
                <div className="space-y-2">
                  {(byColumn.get(col.status) ?? []).map((activity) => {
                    const plan = activity.performancePlanId ? planById.get(activity.performancePlanId) : undefined;
                    const evCount = (evidenceByActivityId.get(activity.id) ?? []).length;
                    return (
                      <div key={activity.id} className="rounded-card border border-border bg-card p-3 text-xs">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={selectedIds.has(activity.id)}
                            onCheckedChange={() => toggle(activity.id)}
                            aria-label={`Pilih ${activity.description}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-muted-foreground">{formatIndonesianDate(activity.date)}</p>
                            <p className="line-clamp-2 font-medium">{activity.description}</p>
                            {plan ? <p className="mt-1 line-clamp-1 text-muted-foreground">{plan.displayName ?? plan.name}</p> : null}
                            <p className="mt-1 text-muted-foreground">{evCount} bukti</p>
                            {activity.evidenceLink ? (
                              <a
                                href={activity.evidenceLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 flex items-center gap-1 text-primary hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                Buka tautan
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(byColumn.get(col.status) ?? []).length === 0 ? (
                    <p className="rounded-card border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
                      Tidak ada kegiatan
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tempel Tautan Massal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Isi link yang sama untuk semua kegiatan terpilih (mis. satu folder Drive untuk sebulan)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={sameLinkUrl}
                  onChange={(e) => setSameLinkUrl(e.target.value)}
                  placeholder="https://drive.google.com/…"
                  className="flex h-11 w-full rounded-control border border-input bg-background px-3 text-sm"
                />
                <Button type="button" variant="outline" onClick={applySameLinkToAll} disabled={!sameLinkUrl.trim()}>
                  Terapkan ke semua
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Atau tempel tautan berbeda per baris (satu baris per kegiatan, urutan sama seperti daftar di bawah)
              </label>
              <Textarea
                rows={3}
                value={bulkPaste}
                onChange={(e) => applyBulkPaste(e.target.value)}
                placeholder={'https://drive.google.com/...\nhttps://drive.google.com/...'}
              />
            </div>
            <div className="space-y-2">
              {selected.map((activity, i) => (
                <div key={activity.id} className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {i + 1}. {formatIndonesianDate(activity.date)} — {activity.description}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={linkValues[activity.id] ?? ''}
                      onChange={(e) => setLinkValues((prev) => ({ ...prev, [activity.id]: e.target.value }))}
                      placeholder="https://…"
                      className="flex h-11 w-full rounded-control border border-input bg-background px-3 text-sm"
                    />
                    {linkValues[activity.id] ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Buka di tab baru"
                        onClick={() => window.open(linkValues[activity.id], '_blank', 'noopener')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                  {linkErrors[activity.id] ? <p className="text-xs text-destructive">{linkErrors[activity.id]}</p> : null}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" onClick={() => void confirmLinks()}>
                Simpan Tautan
              </Button>
              <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
