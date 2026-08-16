// PRD §8.1: lib/date/ is where ALL date operations live. Every other module
// that needs to parse/format/shift a "YYYY-MM-DD" string imports from here
// instead of re-deriving it — keeps the noUncheckedIndexedAccess-safe
// parsing in exactly one place.

/** Local-time components (not `new Date(string)`) to avoid UTC-parse day shift. */
export function parseDateString(date: string): Date {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}

export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayString(): string {
  return formatDateString(new Date());
}

export function addDays(date: string, delta: number): string {
  const d = parseDateString(date);
  return formatDateString(new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** 0=Minggu..6=Sabtu, matches Date#getDay(). */
export function getWeekday(date: string): number {
  return parseDateString(date).getDay();
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** "2026-08-02" -> "02 Agustus 2026" (§10.12.1/§13.1 report date style). */
export function formatIndonesianDate(date: string): string {
  const d = parseDateString(date);
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
}

const WEEKDAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];

/** "2026-08-02" -> "Minggu" (index matches Date#getDay(), 0=Minggu). */
export function formatIndonesianWeekday(date: string): string {
  return WEEKDAY_NAMES_ID[getWeekday(date)] as string;
}
