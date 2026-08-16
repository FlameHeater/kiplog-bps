import { useState } from 'react';
import { Eye, Pencil, Download, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EvidenceThumbnail } from './EvidenceThumbnail';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { evidenceRepository } from '@/db/repositories';
import type { Evidence, EvidenceCategory } from '@/types';

const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  screenshot: 'Screenshot',
  dokumen: 'Dokumen',
  foto: 'Foto',
  spreadsheet: 'Spreadsheet',
  surat_tugas: 'Surat Tugas',
  notulen: 'Notulen',
  tautan: 'Tautan',
  lainnya: 'Lainnya',
};

interface EvidenceCardProps {
  evidence: Evidence;
  onPreview: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

// FR-EVD-01/07.
export function EvidenceCard({ evidence, onPreview, onMoveUp, onMoveDown }: EvidenceCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [fileName, setFileName] = useState(evidence.fileName ?? '');
  const [caption, setCaption] = useState(evidence.caption);
  const [category, setCategory] = useState<EvidenceCategory>(evidence.category);
  const fileUrl = useObjectUrl(evidence.blob);

  async function saveEdits() {
    await evidenceRepository.update(evidence.id, { fileName, caption, category });
    setEditOpen(false);
  }

  function download() {
    if (!fileUrl) return;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = evidence.fileName ?? 'bukti-dukung';
    a.click();
  }

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <button type="button" onClick={onPreview} className="block aspect-square w-full">
        <EvidenceThumbnail evidence={evidence} className="h-full w-full object-cover" />
      </button>
      <div className="p-2">
        <p className="line-clamp-1 text-xs font-medium" title={evidence.fileName ?? evidence.linkTitle}>
          {evidence.fileName ?? evidence.linkTitle ?? 'Tautan'}
        </p>
        <p className="text-[10px] text-muted-foreground">{CATEGORY_LABELS[evidence.category]}</p>
        <div className="mt-1.5 flex items-center gap-0.5">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onPreview} aria-label="Pratinjau">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Popover open={editOpen} onOpenChange={setEditOpen}>
            <PopoverTrigger asChild>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Ubah nama/caption/kategori">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-2 p-3">
              <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="Nama file" />
              <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" />
              <Select value={category} onValueChange={(v) => setCategory(v as EvidenceCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" onClick={() => void saveEdits()}>
                Simpan
              </Button>
            </PopoverContent>
          </Popover>
          {evidence.kind === 'file' ? (
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={download} aria-label="Unduh">
              <Download className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {onMoveUp ? (
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onMoveUp} aria-label="Pindah ke atas">
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {onMoveDown ? (
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onMoveDown} aria-label="Pindah ke bawah">
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="ml-auto h-8 w-8"
            onClick={() => void evidenceRepository.remove(evidence.id)}
            aria-label="Hapus"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}
