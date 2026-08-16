import type { Activity } from '@/types';

// FR-DAT-06 — KipApp's "Download Excel" export on the Pelaksanaan submenu.
// Column layout isn't guaranteed stable, so parsing only extracts raw rows;
// mapping which column is which happens in the UI (§17.1: "Pemetaan kolom
// dilakukan pengguna lewat UI karena format dapat berubah").

export interface ParsedKipAppSheet {
  headers: string[];
  rows: string[][];
}

const HEADER_UNRECOGNIZED_MESSAGE =
  'Struktur kolom tidak dikenali. Petakan kolom secara manual pada langkah berikutnya.';

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'object' && 'text' in (value as Record<string, unknown>)) {
    return String((value as { text: unknown }).text ?? '');
  }
  if (typeof value === 'object' && 'result' in (value as Record<string, unknown>)) {
    return String((value as { result: unknown }).result ?? '');
  }
  return String(value).trim();
}

export async function parseKipAppExcelFile(file: File): Promise<ParsedKipAppSheet> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    throw new Error(HEADER_UNRECOGNIZED_MESSAGE);
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    headers.push(cellToString(cell.value));
  });
  if (headers.length === 0) {
    throw new Error(HEADER_UNRECOGNIZED_MESSAGE);
  }

  const rows: string[][] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: string[] = [];
    for (let col = 1; col <= headers.length; col++) {
      values.push(cellToString(row.getCell(col).value));
    }
    if (values.some((v) => v !== '')) rows.push(values);
  });

  return { headers, rows };
}

// Best-effort guess so the mapping UI pre-fills when KipApp's usual header
// names are present; the user can always override every field manually.
export function guessColumnIndex(headers: string[], keywords: string[]): number | null {
  const lower = headers.map((h) => h.toLowerCase());
  for (const keyword of keywords) {
    const idx = lower.findIndex((h) => h.includes(keyword));
    if (idx !== -1) return idx;
  }
  return null;
}

export interface ColumnMapping {
  dateColumn: number;
  descriptionColumn: number;
}

export interface ReconciliationRow {
  date: string;
  description: string;
  matched: boolean;
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function normalizeDate(raw: string): string | null {
  const isoMatch = /^\d{4}-\d{2}-\d{2}/.exec(raw);
  if (isoMatch) return isoMatch[0];
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw.trim());
  if (dmy) {
    return `${dmy[3]}-${dmy[2]!.padStart(2, '0')}-${dmy[1]!.padStart(2, '0')}`;
  }
  return null;
}

// Matches by date + case-insensitive substring on description — KipApp and
// KipLog don't share IDs, so exact matching isn't possible.
export function reconcileWithLocalActivities(
  sheet: ParsedKipAppSheet,
  mapping: ColumnMapping,
  localActivities: Activity[]
): ReconciliationRow[] {
  const byDate = new Map<string, Activity[]>();
  for (const activity of localActivities) {
    const list = byDate.get(activity.date) ?? [];
    list.push(activity);
    byDate.set(activity.date, list);
  }

  return sheet.rows.map((row) => {
    const rawDate = row[mapping.dateColumn] ?? '';
    const description = row[mapping.descriptionColumn] ?? '';
    const date = normalizeDate(rawDate) ?? rawDate;
    const candidates = byDate.get(date) ?? [];
    const needle = normalize(description);
    const matched = candidates.some((activity) => {
      const haystack = normalize(activity.description);
      return needle.length > 0 && (haystack.includes(needle) || needle.includes(haystack));
    });
    return { date, description, matched };
  });
}
