import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useAllTags } from '@/hooks/useAllTags';

// FR-TPL-06 — a few starter suggestions shown when the field is empty.
const STARTER_TAGS = [
  'SE2026',
  'SNLIK',
  'Desa Cantik',
  'Analisis',
  'Lapangan',
  'Administrasi',
  'Rapat',
  'Kehumasan',
  'Data',
  'Publikasi',
  'Pembinaan',
  'Monitoring',
];

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

// FR-TPL-05: free-text tags with autocomplete from every tag already used
// across activities/templates, falling back to the starter list when empty.
export function TagInput({ value, onChange }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const existingTags = useAllTags();

  const suggestions = useMemo(() => {
    const pool = draft.trim() ? existingTags : Array.from(new Set([...existingTags, ...STARTER_TAGS]));
    const q = draft.trim().toLowerCase();
    return pool
      .filter((t) => !value.includes(t))
      .filter((t) => !q || t.toLowerCase().includes(q))
      .slice(0, 12);
  }, [draft, existingTags, value]);

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft('');
  }

  return (
    <div>
      <Input
        placeholder="Ketik tag, Enter untuk tambah"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addTag(draft);
          }
        }}
      />
      {value.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
              {tag}
              <button
                type="button"
                aria-label={`Hapus tag ${tag}`}
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {suggestions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              + {tag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
