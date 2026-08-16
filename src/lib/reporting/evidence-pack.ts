import { formatIndonesianDate, parseDateString, todayString } from '@/lib/date/date-utils';
import { generateDataDukungPdf, type PdfActivityInput } from './pdf-data-dukung';
import { generateActivityExcel } from './excel-export';
import type { Activity, Evidence, PerformancePlan, UserProfile } from '@/types';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

function sanitizeFilename(text: string): string {
  return text.replace(INVALID_FILENAME_CHARS, '').trim();
}

function slugify(text: string, maxLen: number): string {
  const cleaned = sanitizeFilename(text).replace(/\s+/g, '-');
  const truncated = cleaned.slice(0, maxLen).replace(/-+$/, '');
  return truncated || 'Tanpa-Judul';
}

function monthFolderName(date: string): string {
  const d = parseDateString(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${month}-${MONTH_NAMES_ID[d.getMonth()]}`;
}

function extensionFromMimeType(mimeType: string | undefined): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  };
  return (mimeType && map[mimeType]) || 'bin';
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export interface EvidencePackInput {
  activity: Activity;
  plan: PerformancePlan | null;
  evidence: Evidence[];
}

// §13.3 — grouped by month then by Rencana Kinerja (KipApp's own workflow order).
export async function generateEvidencePack(
  items: EvidencePackInput[],
  plans: PerformancePlan[],
  profile: UserProfile
): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const sorted = items.slice().sort((a, b) => a.activity.date.localeCompare(b.activity.date));
  const firstDate = sorted[0]?.activity.date ?? todayString();
  const lastDate = sorted[sorted.length - 1]?.activity.date ?? firstDate;
  const rootLabel = firstDate.slice(0, 7) === lastDate.slice(0, 7) ? firstDate.slice(0, 7) : `${firstDate}_${lastDate}`;
  const root = zip.folder(`KipLog_EvidencePack_${rootLabel}`);
  if (!root) throw new Error('Gagal membuat struktur ZIP.');

  const planNumberById = new Map(plans.map((p, i) => [p.id, i + 1]));

  const pdfItems: PdfActivityInput[] = [];
  const linkRows: string[] = ['Tanggal,Kegiatan,Rencana Kinerja,Link Bukti Dukung'];

  for (const item of sorted) {
    const { activity, plan, evidence } = item;
    pdfItems.push({ activity, plan, evidence });

    const planNumber = plan ? (planNumberById.get(plan.id) ?? 0) : 0;
    const planLabel = plan ? (plan.teamName ?? plan.displayName ?? plan.name) : 'Tanpa-RK';
    const rkFolderName = `RK-${String(planNumber).padStart(2, '0')}-${slugify(planLabel, 60)}`;
    const monthFolder = root.folder(monthFolderName(activity.date));
    const rkFolder = monthFolder?.folder(rkFolderName);
    const activityFolderName = `${activity.date}_${slugify(activity.description, 40)}`;
    const activityFolder = rkFolder?.folder(activityFolderName);
    if (!activityFolder) continue;

    const singlePdf = await generateDataDukungPdf([{ activity, plan, evidence }], profile);
    activityFolder.file('data-dukung.pdf', singlePdf);

    const buktiFolder = activityFolder.folder('bukti');
    if (buktiFolder) {
      let fileIndex = 1;
      const linkLines: string[] = [];
      for (const e of evidence) {
        if (e.kind === 'link') {
          linkLines.push(`${e.linkTitle ?? e.url ?? ''}: ${e.url ?? ''}`);
          continue;
        }
        if (!e.blob) continue;
        const ext = extensionFromMimeType(e.mimeType);
        const baseName = e.fileName ? sanitizeFilename(e.fileName.replace(/\.[^.]+$/, '')) : 'bukti';
        const name = `${String(fileIndex).padStart(2, '0')}_${slugify(baseName, 60)}.${ext}`;
        buktiFolder.file(name, e.blob);
        fileIndex += 1;
      }
      if (linkLines.length > 0) buktiFolder.file('tautan.txt', linkLines.join('\n'));
    }

    linkRows.push(
      [activity.date, csvCell(activity.description), csvCell(planLabel), activity.evidenceLink ?? ''].join(',')
    );
  }

  const summaryExcel = await generateActivityExcel(
    sorted.map((i) => i.activity),
    new Map(plans.map((p) => [p.id, p])),
    new Map(sorted.map((i) => [i.activity.id, i.evidence]))
  );
  root.file('ringkasan.xlsx', summaryExcel);

  const combinedPdf = await generateDataDukungPdf(pdfItems, profile);
  root.file('laporan-gabungan.pdf', combinedPdf);

  root.file('daftar-tautan.csv', '﻿' + linkRows.join('\r\n'));

  const readme = [
    'KipLog BPS — Evidence Pack',
    `Dibuat: ${formatIndonesianDate(todayString())}`,
    `Periode: ${formatIndonesianDate(firstDate)} s.d. ${formatIndonesianDate(lastDate)}`,
    `Jumlah kegiatan: ${sorted.length}`,
    '',
    'Daftar tautan bukti dukung:',
    ...sorted.map((i) => `- ${i.activity.date} | ${i.activity.description} | ${i.activity.evidenceLink ?? '(belum ada tautan)'}`),
    '',
    'Paket ini dibuat secara lokal oleh KipLog BPS. KipLog tidak mengunggah apa pun secara otomatis (lihat §10.13).',
  ].join('\n');
  root.file('README.txt', readme);

  return zip.generateAsync({ type: 'blob' });
}
