// §12.2 — acronyms that must stay uppercase when generating a suggested
// "Capaian" from the description text.
export const KNOWN_ACRONYMS = [
  'SNLIK', 'SE2026', 'OPD', 'PPL', 'PML', 'DTSEN', 'PEKPPP', 'PST',
  'LHKPN', 'SPT', 'BMN', 'QG', 'IKI', 'SKP',
] as const;

/** Restores the canonical casing of any known acronym inside `text`, whatever case it was typed in. */
export function preserveAcronyms(text: string): string {
  let result = text;
  for (const acronym of KNOWN_ACRONYMS) {
    const re = new RegExp(`\\b${acronym}\\b`, 'gi');
    result = result.replace(re, acronym);
  }
  return result;
}
