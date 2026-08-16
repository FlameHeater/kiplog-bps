import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { evidenceRepository } from '@/db/repositories';
import { detectLinkProvider } from './link-provider';
import type { Evidence } from '@/types';

interface AddLinkEvidenceFormProps {
  activityId: string | null;
}

// FR-EVD-09: link evidence stores only URL + title — never fetches the
// link's content or asks for credentials.
export function AddLinkEvidenceForm({ activityId }: AddLinkEvidenceFormProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    try {
      new URL(url);
    } catch {
      setError('Link bukti dukung harus diawali https:// atau http://.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('Link bukti dukung harus diawali https:// atau http://.');
      return;
    }

    const now = new Date().toISOString();
    const evidence: Evidence = {
      id: crypto.randomUUID(),
      activityId,
      kind: 'link',
      url,
      linkTitle: title || undefined,
      linkProvider: detectLinkProvider(url),
      caption: '',
      category: 'tautan',
      sortOrder: 0,
      inboxStatus: activityId ? 'assigned' : 'unassigned',
      capturedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (activityId) {
      await evidenceRepository.addForActivity(evidence);
    } else {
      await evidenceRepository.add(evidence);
    }
    setUrl('');
    setTitle('');
    setError(null);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Link2 className="h-3.5 w-3.5" />
          Tambah sebagai tautan
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2 p-3">
        <div className="space-y-1">
          <Label htmlFor="link-url">URL</Label>
          <Input id="link-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="link-title">Judul (opsional)</Label>
          <Input id="link-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <Button type="button" size="sm" onClick={() => void save()}>
          Simpan
        </Button>
      </PopoverContent>
    </Popover>
  );
}
