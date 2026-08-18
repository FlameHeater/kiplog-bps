import { useId, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

/**
 * Ukuran simpan gambar tampilan.
 *
 * Foto profil dan logo hanya pernah dirender kecil (32–96px), jadi menyimpan
 * berkas kamera 4 MB sebagai data URL hanya membebani IndexedDB dan — karena
 * ikut ke `kiplog-data.json` — setiap sinkronisasi Drive. Diciutkan lebih dulu
 * di kanvas, bukan disimpan apa adanya.
 */
const MAX_DIMENSION = 256;
const OUTPUT_QUALITY = 0.85;

/** Batas masuk akal untuk berkas sumber sebelum diciutkan. */
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

async function shrinkToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Kanvas tidak tersedia');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // PNG untuk gambar bertransparansi (logo), JPEG untuk sisanya supaya foto
  // tidak membengkak berkali-kali lipat.
  const type = file.type === 'image/png' || file.type === 'image/svg+xml' ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(type, OUTPUT_QUALITY);
}

interface ImagePickerFieldProps {
  label: string;
  hint?: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  /** Bulat untuk foto orang, persegi membulat untuk logo. */
  shape?: 'circle' | 'square';
}

export function ImagePickerField({
  label,
  hint,
  value,
  onChange,
  shape = 'square',
}: ImagePickerFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Berkas ini bukan gambar.');
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError('Gambar terlalu besar. Pakai berkas di bawah 8 MB.');
      return;
    }
    try {
      onChange(await shrinkToDataUrl(file));
    } catch {
      setError('Gambar tidak dapat dibaca. Coba berkas lain.');
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-border bg-muted/40',
            shape === 'circle' ? 'rounded-full' : 'rounded-card'
          )}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            {value ? 'Ganti gambar' : 'Pilih gambar'}
          </Button>
          {value ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                onChange(undefined);
                setError(null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Hapus
            </Button>
          ) : null}
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              // Dikosongkan supaya memilih berkas yang SAMA lagi tetap memicu
              // perubahan — kalau tidak, mengganti gambar yang barusan dihapus
              // tidak akan terjadi apa-apa.
              e.target.value = '';
            }}
          />
        </div>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
