import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, FileSpreadsheet, FileJson, FileDown, Printer, Archive } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorBanner } from '@/components/common/ErrorBanner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useActivities } from '@/hooks/useActivities';
import { usePerformancePlans } from '@/hooks/usePerformancePlans';
import { useAllEvidence } from '@/hooks/useAllEvidence';
import { useUserProfile } from '@/hooks/useUserProfile';
import { formatDateString, formatIndonesianDate, todayString } from '@/lib/date/date-utils';
import { buildReportPeriod, REPORT_PERIOD_LABELS, type ReportPeriodKind } from '@/lib/reporting/report-period';
import { buildReportFilename, periodToFilenameSegment } from '@/lib/reporting/filename';
import { generateDataDukungPdf } from '@/lib/reporting/pdf-data-dukung';
import { generateActivityExcel } from '@/lib/reporting/excel-export';
import { generateActivityCsv } from '@/lib/reporting/csv-export';
import { generateActivityJson } from '@/lib/reporting/json-export';
import { generateEvidencePack } from '@/lib/reporting/evidence-pack';
import { buildActivityReportRows } from '@/lib/reporting/activity-rows';
import { groupEvidenceByActivity } from '@/lib/services/evidence-grouping';
import { downloadBlob } from '@/lib/utils/download-blob';
import type { Activity } from '@/types';

// FR-RPT-01…10.
export function LaporanPage() {
  const activities = useActivities();
  const plans = usePerformancePlans();
  const evidence = useAllEvidence();
  const profile = useUserProfile();

  const [searchParams] = useSearchParams();
  const presetPeriod = searchParams.get('period');
  const [periodKind, setPeriodKind] = useState<ReportPeriodKind>(
    presetPeriod === 'mingguan' ? 'mingguan' : 'bulanan'
  );
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [monthAnchor, setMonthAnchor] = useState(() => todayString().slice(0, 7));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const period = useMemo(
    () => buildReportPeriod(periodKind, { start: customStart, end: customEnd }, monthAnchor),
    [periodKind, customStart, customEnd, monthAnchor]
  );

  const planById = useMemo(() => new Map((plans ?? []).map((p) => [p.id, p])), [plans]);
  const evidenceByActivityId = useMemo(() => groupEvidenceByActivity(evidence ?? []), [evidence]);

  const inRange = useMemo(
    () =>
      (activities ?? [])
        .filter((a) => a.date >= period.startDate && a.date <= period.endDate)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [activities, period]
  );

  const selected = useMemo(() => inRange.filter((a) => selectedIds.has(a.id)), [inRange, selectedIds]);
  const active = selected.length > 0 ? selected : inRange;

  function toggleAll() {
    setSelectedIds(selectedIds.size === inRange.length ? new Set() : new Set(inRange.map((a) => a.id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  const periodLabel = periodToFilenameSegment(period.startDate, period.endDate);

  async function handlePdf(activityList: Activity[]) {
    if (!profile || activityList.length === 0) return;
    setIsGenerating('pdf');
    setError(null);
    try {
      const items = activityList.map((activity) => ({
        activity,
        plan: activity.performancePlanId ? (planById.get(activity.performancePlanId) ?? null) : null,
        evidence: evidenceByActivityId.get(activity.id) ?? [],
      }));
      const blob = await generateDataDukungPdf(items, profile);
      downloadBlob(blob, buildReportFilename('DataDukung', periodLabel, 'pdf'));
    } catch {
      setError('Gagal membuat PDF. Coba periode lebih pendek atau kurangi bukti bergambar.');
    } finally {
      setIsGenerating(null);
    }
  }

  async function handleExcel() {
    setIsGenerating('excel');
    setError(null);
    try {
      const blob = await generateActivityExcel(active, planById, evidenceByActivityId);
      downloadBlob(blob, buildReportFilename('Excel', periodLabel, 'xlsx'));
    } catch {
      setError('Gagal membuat berkas Excel. Coba periode lebih pendek.');
    } finally {
      setIsGenerating(null);
    }
  }

  function handleCsv() {
    const blob = generateActivityCsv(active, planById, evidenceByActivityId);
    downloadBlob(blob, buildReportFilename('CSV', periodLabel, 'csv'));
  }

  function handleJson() {
    const blob = generateActivityJson(active, planById, evidenceByActivityId);
    downloadBlob(blob, buildReportFilename('JSON', periodLabel, 'json'));
  }

  async function handleEvidencePack() {
    if (!profile || active.length === 0) return;
    setIsGenerating('pack');
    setError(null);
    try {
      const items = active.map((activity) => ({
        activity,
        plan: activity.performancePlanId ? (planById.get(activity.performancePlanId) ?? null) : null,
        evidence: evidenceByActivityId.get(activity.id) ?? [],
      }));
      const blob = await generateEvidencePack(items, plans ?? [], profile);
      downloadBlob(blob, buildReportFilename('EvidencePack', periodLabel, 'zip'));
    } catch {
      setError('Gagal membuat Evidence Pack. Coba periode lebih pendek atau kurangi bukti bergambar.');
    } finally {
      setIsGenerating(null);
    }
  }

  if (activities === undefined) return null;

  const rows = buildActivityReportRows(active, planById, evidenceByActivityId);

  return (
    <div>
      <PageHeader
        title="Laporan"
        description={`${active.length} kegiatan pada periode ${REPORT_PERIOD_LABELS[periodKind].toLowerCase()} terpilih`}
      />

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Periode</label>
          <Select value={periodKind} onValueChange={(v) => setPeriodKind(v as ReportPeriodKind)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(REPORT_PERIOD_LABELS) as ReportPeriodKind[]).map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {REPORT_PERIOD_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {periodKind === 'bulanan' ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Bulan</label>
            <Input type="month" value={monthAnchor} onChange={(e) => setMonthAnchor(e.target.value)} />
          </div>
        ) : null}
        {periodKind === 'custom' ? (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Dari</label>
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Sampai</label>
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          </>
        ) : (
          <p className="pb-2 text-xs text-muted-foreground">
            {formatIndonesianDate(period.startDate)} – {formatIndonesianDate(period.endDate)}
          </p>
        )}
      </div>

      {inRange.length === 0 ? (
        <EmptyState title="Tidak ada kegiatan pada periode ini." action={<Button onClick={() => setPeriodKind('bulanan')}>Ubah Periode</Button>} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button disabled={isGenerating !== null} onClick={() => void handlePdf(active)}>
              <FileText className="h-4 w-4" aria-hidden="true" />
              {isGenerating === 'pdf' ? 'Membuat PDF…' : 'Unduh PDF Gabungan'}
            </Button>
            <Button variant="outline" disabled={isGenerating !== null} onClick={() => void handleExcel()}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              {isGenerating === 'excel' ? 'Membuat Excel…' : 'Unduh Excel'}
            </Button>
            <Button variant="outline" onClick={handleCsv}>
              <FileDown className="h-4 w-4" aria-hidden="true" />
              Unduh CSV
            </Button>
            <Button variant="outline" onClick={handleJson}>
              <FileJson className="h-4 w-4" aria-hidden="true" />
              Unduh JSON
            </Button>
            <Button variant="outline" onClick={() => setShowPrint(true)}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Cetak (HTML)
            </Button>
            <Button variant="outline" disabled={isGenerating !== null} onClick={() => void handleEvidencePack()}>
              <Archive className="h-4 w-4" aria-hidden="true" />
              {isGenerating === 'pack' ? 'Membuat Evidence Pack…' : 'Unduh Evidence Pack (ZIP)'}
            </Button>
          </div>

          {active.length > 20 && isGenerating !== null ? (
            <p className="mb-3 text-xs text-muted-foreground">
              Memproses {active.length} kegiatan, mohon tunggu — aplikasi tetap dapat digunakan.
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs text-secondary-foreground">
                <tr>
                  <th className="w-8 p-3">
                    <Checkbox checked={selectedIds.size === inRange.length && inRange.length > 0} onCheckedChange={toggleAll} aria-label="Pilih semua" />
                  </th>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Kegiatan</th>
                  <th className="p-3">Rencana Kinerja</th>
                  <th className="p-3">Progress</th>
                  <th className="p-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {inRange.map((activity) => (
                  <tr key={activity.id} className="border-t border-border">
                    <td className="p-3">
                      <Checkbox checked={selectedIds.has(activity.id)} onCheckedChange={() => toggleOne(activity.id)} aria-label={`Pilih ${activity.description}`} />
                    </td>
                    <td className="p-3 whitespace-nowrap">{formatIndonesianDate(activity.date)}</td>
                    <td className="p-3">{activity.description}</td>
                    <td className="p-3 text-muted-foreground">
                      {activity.performancePlanId ? (planById.get(activity.performancePlanId)?.displayName ?? planById.get(activity.performancePlanId)?.name ?? '-') : '-'}
                    </td>
                    <td className="p-3">{activity.progress}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" disabled={isGenerating !== null} onClick={() => void handlePdf([activity])}>
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showPrint ? (
        <div className="print-area fixed inset-0 z-50 overflow-y-auto bg-background p-8">
          <div className="no-print mb-4 flex gap-2">
            <Button onClick={() => window.print()}>Cetak</Button>
            <Button variant="outline" onClick={() => setShowPrint(false)}>
              Tutup
            </Button>
          </div>
          <h1 className="mb-4 text-lg font-semibold">
            Laporan Kegiatan — {formatIndonesianDate(period.startDate)} s.d. {formatIndonesianDate(period.endDate)}
          </h1>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {rows[0]
                  ? Object.keys(rows[0]).map((key) => (
                      <th key={key} className="border border-border p-1 text-left">
                        {key}
                      </th>
                    ))
                  : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {Object.entries(row).map(([key, value]) => (
                    <td key={key} className="border border-border p-1">
                      {key === 'Tanggal' ? formatIndonesianDate(formatDateString(value as Date)) : String(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
