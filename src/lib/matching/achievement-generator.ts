import { preserveAcronyms } from './acronyms';

export interface AchievementSuggestion {
  text: string;
  isDefault: boolean;
}

// §12.2 — pattern alternates, only meaningful when progress is 100 (they
// all assert completion).
const COMPLETION_PATTERNS: [RegExp, string][] = [
  [/^melakukan\s+/i, 'Terselesaikannya '],
  [/^melaksanakan\s+/i, 'Terlaksananya '],
  [/^menyusun\s+/i, 'Tersusunnya '],
  [/^membuat\s+/i, 'Terbuatnya '],
  [/^menginput\s+/i, 'Terinputnya '],
  [/^mengikuti\s+/i, 'Terlaksananya keikutsertaan dalam '],
  [/^memeriksa\s+/i, 'Terperiksanya '],
  [/^mengolah\s+/i, 'Terolahnya '],
];

/**
 * §12.2 — default is always "Terselesaikannya " + the description verbatim
 * (the leading verb, e.g. "Melakukan", is kept — that matches the real
 * Data Dukung example in the PRD). Pattern-based alternates are offered as
 * a secondary/tertiary option, never the default. When progress < 100 the
 * sentence must never claim completion.
 */
export function generateAchievementSuggestions(
  description: string,
  progress: number
): AchievementSuggestion[] {
  const trimmed = description.trim();
  if (!trimmed) return [];

  if (progress < 100) {
    return [
      {
        text: preserveAcronyms(`Terlaksananya sebagian ${trimmed} (progress ${progress}%)`),
        isDefault: true,
      },
    ];
  }

  const suggestions: AchievementSuggestion[] = [
    { text: preserveAcronyms(`Terselesaikannya ${trimmed}`), isDefault: true },
  ];

  for (const [pattern, replacement] of COMPLETION_PATTERNS) {
    if (!pattern.test(trimmed)) continue;
    const alt = preserveAcronyms(trimmed.replace(pattern, replacement));
    if (!suggestions.some((s) => s.text.toLowerCase() === alt.toLowerCase())) {
      suggestions.push({ text: alt, isDefault: false });
    }
  }

  return suggestions.slice(0, 3);
}
