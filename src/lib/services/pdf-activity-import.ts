import type { Activity } from '@/types';
import { deriveYearAndSkpPeriod } from './activity-fields';
import { generateAchievementSuggestions } from '@/lib/matching/achievement-generator';

// Parses "Rincian Aktivitas" PDF exports (date / time / description /
// coordinate table from a GPS attendance app) into draft KipLog activities.
// Not the KipApp Excel format (see kipapp-import.ts) — a different source.

export interface ParsedActivityRow {
  date: string;
  time: string;
  description: string;
  isPresence: boolean;
}

// pdfjs's text extraction inserts a space between a leading "-" and the
// digits that follow it ("- 8.1150213," / "2026 - \n04 - 01"), so every
// hyphen boundary below tolerates optional whitespace.
const COORD_RE = /-?\s*\d+\.\d+,\s*-?\s*\d+\.\d+/;
const ROW_RE = new RegExp(
  `(\\d{4}\\s*-\\s*\\d{2}\\s*-\\s*\\d{2})?\\s*(\\d{2}:\\d{2})\\s+(.+?)\\s+(${COORD_RE.source})`,
  'g'
);
const PRESENCE_RE = /kehadiran\s*\/?\s*presensi/i;

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if ('str' in item) text += item.str + (item.hasEOL ? '\n' : ' ');
    }
  }
  return text;
}

export function parseActivityRows(rawText: string): ParsedActivityRow[] {
  const flat = rawText.replace(/\s+/g, ' ').trim();
  const rows: ParsedActivityRow[] = [];
  let currentDate = '';

  for (const match of flat.matchAll(ROW_RE)) {
    const [, dateGroup, time, descriptionRaw] = match;
    if (dateGroup) currentDate = dateGroup.replace(/\s+/g, '');
    if (!currentDate || !time || !descriptionRaw) continue;
    const description = descriptionRaw.trim();
    rows.push({ date: currentDate, time, description, isPresence: PRESENCE_RE.test(description) });
  }
  return rows;
}

export interface DraftActivity {
  date: string;
  description: string;
}

// Non-presence rows are the real work log. The PDF's own per-row timestamps
// are just "when this line was logged" (usually near end-of-day), not a
// meaningful start/end for each activity, so they're deliberately NOT
// carried into KipLog — every draft gets one shared default time window
// (see draftToActivity) that the user can adjust per activity after import.
// Descriptions with multiple items ("A; B; C") become separate draft
// activities so each can be reviewed/RK-matched independently.
export function buildDraftActivities(rows: ParsedActivityRow[]): DraftActivity[] {
  const drafts: DraftActivity[] = [];
  for (const row of rows) {
    if (row.isPresence || !row.description) continue;
    for (const item of row.description.split(';')) {
      // pdfjs's text extraction spaces out every hyphen it hits, including
      // inside compound words ("se-Provinsi" -> "se - Provinsi") — undo that
      // for anything that isn't a standalone dash between two words.
      const description = item.trim().replace(/(\S) - (\S)/g, '$1-$2');
      if (description) drafts.push({ date: row.date, description });
    }
  }
  return drafts;
}

export async function parsePdfActivityFile(file: File): Promise<DraftActivity[]> {
  const text = await extractPdfText(file);
  const rows = parseActivityRows(text);
  return buildDraftActivities(rows);
}

export interface DraftActivityConfig {
  performancePlanId: string | null;
}

// FR-SCG: progress is always 100 (this is a historical log of completed
// work), so the achievement suggestion always uses the "completed" template
// — same generator used by the manual "Sarankan capaian" button.
//
// startTime/endTime are always '' ("waktu tidak dicatat") — the PDF's own
// per-row timestamps are log times, not real activity times (see the
// buildDraftActivities comment above), and defaulting to a fixed work-hours
// window claimed a precision the source data doesn't have. The user picks a
// real time later if they want one.
export function draftToActivity(draft: DraftActivity, config: DraftActivityConfig): Activity {
  const now = new Date().toISOString();
  const { year, skpPeriod } = deriveYearAndSkpPeriod(draft.date);
  const [suggestion] = generateAchievementSuggestions(draft.description, 100);

  return {
    id: crypto.randomUUID(),
    date: draft.date,
    startTime: '',
    endTime: '',
    description: draft.description,
    progress: 100,
    achievement: suggestion?.text ?? '',
    evidenceLink: null,
    countsTowardSkp: true,

    year,
    skpPeriod,
    performancePlanId: config.performancePlanId,

    durationMinutes: 0,
    status: 'draft',
    evidenceLinkStatus: 'none',
    tags: [],
    rbAreas: [],
    evidenceCount: 0,
    reportedAt: null,
    sentForReview: false,
    templateId: null,

    createdAt: now,
    updatedAt: now,
  };
}
