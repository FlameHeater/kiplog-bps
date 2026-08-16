// §12.1.1 — shared normalization for the RK matcher.
const STOPWORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'melakukan',
  'melaksanakan', 'kegiatan', 'terkait', 'dalam', 'oleh', 'atas', 'sebagai',
  'serta', 'akan', 'telah',
]);

/** Lowercase + strip punctuation, keep as free text (for keyword substring matching). */
export function cleanText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** cleanText → tokenize → drop stopwords → keep tokens >= 3 chars (for Dice comparisons). */
export function tokenize(input: string): Set<string> {
  const tokens = cleanText(input).split(' ').filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return new Set(tokens);
}

/** 2|A∩B| / (|A|+|B|); 0 when both sets are empty. */
export function diceCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  return (2 * intersection) / (a.size + b.size);
}
