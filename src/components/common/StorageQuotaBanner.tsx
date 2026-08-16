import { useStorageEstimate } from '@/hooks/useStorageEstimate';
import { cn } from '@/lib/utils/cn';

const WARNING_THRESHOLD = 80;
const CRITICAL_THRESHOLD = 95;

// ST-04 + §17.1 "Penyimpanan hampir penuh" message.
export function StorageQuotaBanner() {
  const { usagePercent } = useStorageEstimate();

  if (usagePercent === null || usagePercent < WARNING_THRESHOLD) return null;

  const critical = usagePercent >= CRITICAL_THRESHOLD;

  return (
    <div
      className={cn(
        'mb-4 rounded-control border px-3 py-2 text-sm',
        critical ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-warning/40 bg-warning/10 text-warning'
      )}
      role="alert"
    >
      Penyimpanan lokal terpakai {usagePercent}%. Lakukan Backup Data lalu hapus bukti dukung lama.
    </div>
  );
}
