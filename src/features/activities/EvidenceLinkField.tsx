import { ClipboardPaste, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface EvidenceLinkFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

// FR-ACT-08. SEC-05 (http/https only) is enforced by OptionalEvidenceLinkSchema
// at validation time; SEC-06 (noopener/noreferrer) is enforced by window.open below.
export function EvidenceLinkField({ value, onChange, error }: EvidenceLinkFieldProps) {
  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text.trim());
    } catch {
      // Clipboard permission denied or unavailable — user can still type/paste manually.
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="https://drive.google.com/…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button type="button" variant="outline" size="icon" onClick={pasteFromClipboard} aria-label="Tempel dari clipboard">
          <ClipboardPaste className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!value}
          aria-label="Buka tautan"
          onClick={() => window.open(value, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
