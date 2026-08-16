import { saveAs } from 'file-saver';

export function downloadBlob(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}
